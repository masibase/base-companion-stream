// ponytail: hand-rolled std HTTP+SSE server — no axum/tokio deps. Swap if
// streaming/scale needs a real framework.
use std::io::{BufRead, BufReader, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;

const INDEX_HTML: &str = include_str!("../../../overlay/index.html");

pub struct OverlayServer {
    clients: Arc<Mutex<Vec<Sender<String>>>>,
    listener: Mutex<Option<TcpListener>>,
}

impl Default for OverlayServer {
    fn default() -> Self {
        Self {
            clients: Arc::new(Mutex::new(Vec::new())),
            listener: Mutex::new(None),
        }
    }
}

impl OverlayServer {
    pub fn start(&self, port: u16) -> Result<(), String> {
        let listener = TcpListener::bind(("127.0.0.1", port)).map_err(|e| e.to_string())?;
        *self.listener.lock().unwrap() = Some(listener.try_clone().map_err(|e| e.to_string())?);
        let clients = Arc::clone(&self.clients);
        thread::spawn(move || {
            for stream in listener.incoming() {
                if let Ok(stream) = stream {
                    let clients = Arc::clone(&clients);
                    thread::spawn(move || handle_client(stream, clients));
                }
            }
        });
        Ok(())
    }

    pub fn stop(&self) {
        *self.listener.lock().unwrap() = None;
        self.clients.lock().unwrap().clear();
    }

    pub fn broadcast(&self, data: &str) {
        let mut clients = self.clients.lock().unwrap();
        clients.retain(|sender| sender.send(data.to_string()).is_ok());
    }
}

type ClientRegistry = Arc<Mutex<Vec<Sender<String>>>>;

fn parse_request_line(line: &str) -> (String, String) {
    let mut parts = line.split_whitespace();
    let method = parts.next().unwrap_or("").to_string();
    let path = parts.next().unwrap_or("").to_string();
    (method, path)
}

fn handle_client(stream: TcpStream, clients: ClientRegistry) {
    let cloned = match stream.try_clone() {
        Ok(c) => c,
        Err(_) => return,
    };
    let mut reader = BufReader::new(cloned);
    let mut line = String::new();
    if reader.read_line(&mut line).is_err() {
        return;
    }
    let (method, path) = parse_request_line(line.trim());
    let mut writer = match stream.try_clone() {
        Ok(c) => c,
        Err(_) => return,
    };
    match (method.as_str(), path.as_str()) {
        ("GET", "/") | ("GET", "/index.html") => {
            let _ = write!(
                writer,
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                INDEX_HTML.len(),
                INDEX_HTML
            );
        }
        ("GET", "/health") => {
            let body = r#"{"ok":true}"#;
            let _ = write!(
                writer,
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                body.len(),
                body
            );
        }
        ("GET", "/events") => {
            let (sender, receiver): (Sender<String>, Receiver<String>) = channel();
            clients.lock().unwrap().push(sender);
            let _ = write!(
                writer,
                "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nCache-Control: no-cache\r\nConnection: keep-alive\r\n\r\n"
            );
            let _ = writer.flush();
            while let Ok(data) = receiver.recv() {
                if write!(writer, "data: {}\n\n", data).is_err() {
                    break;
                }
                let _ = writer.flush();
            }
        }
        _ => {
            let body = "not found";
            let _ = write!(
                writer,
                "HTTP/1.1 404 Not Found\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                body.len(),
                body
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::parse_request_line;

    #[test]
    fn parses_get_request_line() {
        assert_eq!(
            parse_request_line("GET /events HTTP/1.1"),
            ("GET".to_string(), "/events".to_string())
        );
        assert_eq!(parse_request_line(""), ("".to_string(), "".to_string()));
    }
}
