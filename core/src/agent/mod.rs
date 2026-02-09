pub mod inspector;

use std::sync::mpsc;

/// Requests the inspector HTTP server can send to the game loop.
#[derive(Debug)]
pub enum InspectorRequest {
    Health,
    GetState { path: Option<String> },
    Describe { verbosity: Option<String> },
    ListActions,
    ExecuteAction { name: String, payload: String },
    Rewind { steps: u32 },
    Simulate { action: String },
    GetHistory,
}

/// Response from the game loop back to the inspector HTTP server.
#[derive(Debug)]
pub struct InspectorResponse {
    pub status: u16,
    pub content_type: String,
    pub body: String,
}

impl InspectorResponse {
    pub fn json(body: String) -> Self {
        Self {
            status: 200,
            content_type: "application/json".into(),
            body,
        }
    }

    pub fn text(body: String) -> Self {
        Self {
            status: 200,
            content_type: "text/plain".into(),
            body,
        }
    }

    pub fn error(status: u16, message: String) -> Self {
        Self {
            status,
            content_type: "application/json".into(),
            body: format!("{{\"error\":\"{message}\"}}"),
        }
    }
}

/// Sender half: used by the game loop to respond to inspector requests.
pub type ResponseSender = mpsc::Sender<InspectorResponse>;

/// A request bundled with a channel to send the response back.
pub type InspectorMessage = (InspectorRequest, ResponseSender);

/// Sender half: used by the inspector HTTP server to send requests to the game loop.
pub type RequestSender = mpsc::Sender<InspectorMessage>;

/// Receiver half: used by the game loop to receive requests from the inspector.
pub type RequestReceiver = mpsc::Receiver<InspectorMessage>;

/// Create a new inspector channel pair.
pub fn inspector_channel() -> (RequestSender, RequestReceiver) {
    mpsc::channel()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inspector_channel_round_trip() {
        let (tx, rx) = inspector_channel();

        // Simulate inspector sending a request
        let (resp_tx, resp_rx) = mpsc::channel();
        tx.send((InspectorRequest::Health, resp_tx)).unwrap();

        // Simulate game loop receiving and responding
        let (req, sender) = rx.recv().unwrap();
        assert!(matches!(req, InspectorRequest::Health));
        sender
            .send(InspectorResponse::json("{\"status\":\"ok\"}".into()))
            .unwrap();

        // Verify inspector gets the response
        let response = resp_rx.recv().unwrap();
        assert_eq!(response.status, 200);
        assert_eq!(response.content_type, "application/json");
        assert!(response.body.contains("ok"));
    }

    #[test]
    fn inspector_response_constructors() {
        let json = InspectorResponse::json("{\"key\":1}".into());
        assert_eq!(json.status, 200);
        assert_eq!(json.content_type, "application/json");

        let text = InspectorResponse::text("hello".into());
        assert_eq!(text.status, 200);
        assert_eq!(text.content_type, "text/plain");

        let err = InspectorResponse::error(404, "not found".into());
        assert_eq!(err.status, 404);
        assert!(err.body.contains("not found"));
    }

    #[test]
    fn inspector_request_variants() {
        // Ensure all variants construct correctly
        let requests = vec![
            InspectorRequest::Health,
            InspectorRequest::GetState { path: None },
            InspectorRequest::GetState {
                path: Some("player.hp".into()),
            },
            InspectorRequest::Describe {
                verbosity: Some("full".into()),
            },
            InspectorRequest::ListActions,
            InspectorRequest::ExecuteAction {
                name: "move".into(),
                payload: "{}".into(),
            },
            InspectorRequest::Rewind { steps: 3 },
            InspectorRequest::Simulate {
                action: "attack".into(),
            },
            InspectorRequest::GetHistory,
        ];
        assert_eq!(requests.len(), 9);
    }
}
