# Run the WebMCP challenge project locally

The submitted live app is `https://agent.atinamos.co.uk/`.

For independent local reproduction, this repository also includes a small public reference Agent Shop under [`demo/`](demo/). It runs the published WebMCP source directly and reproduces the challenge-facing flow without production secrets.

## Start

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
python -m pip install -r demo/requirements.txt
python -m uvicorn demo.app:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/` in ChatGPT's in-app browser, or Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled.

## Reproduce the authority boundary

Ask the browser agent to quote `json-repair`, then begin a purchase using malformed JSON such as:

```json
{"json":"{'name': 'Atinamos', 'price': 0.005,}","mode":"repair"}
```

The first request returns HTTP 402 and WebMCP stops. The local page then requires a visible human click on **Approve local demo continuation** before the deterministic service executes and returns HTTP 200. The completed structured result is available to `get_request_status`.

The local approval is intentionally not represented as a blockchain payment. The real Base/x402 payment, verification and settlement are demonstrated on the submitted live URL and in the public demo video. See [`demo/README.md`](demo/README.md) for the full test sequence and [`docs/CHALLENGE_HISTORY.md`](docs/CHALLENGE_HISTORY.md) for pre-existing vs challenge-period work.
