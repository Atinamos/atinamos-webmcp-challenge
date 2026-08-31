from fastapi.testclient import TestClient

from demo.app import app


client = TestClient(app)


def test_catalog_exposes_json_repair():
    response = client.get('/v1/catalog')
    assert response.status_code == 200
    services = response.json()['services']
    service = next(item for item in services if item['slug'] == 'json-repair')
    assert service['price_usdc'] == 0.005
    assert service['api']['path'] == '/agent/json-repair'


def test_json_repair_stops_at_402_before_human_demo_approval():
    response = client.post('/agent/json-repair', json={
        'json': "{'name': 'Atinamos', 'price': 0.005,}",
        'mode': 'repair',
    })
    assert response.status_code == 402
    assert 'payment-required' in response.headers
    assert response.json()['error'] == 'payment_required'


def test_json_repair_runs_after_explicit_demo_approval():
    response = client.post(
        '/agent/json-repair',
        headers={'X-Atinamos-Demo-Approval': 'approved'},
        json={
            'json': "{'name': 'Atinamos', 'price': 0.005,}",
            'mode': 'repair',
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload['valid'] is True
    assert payload['result'] == {'name': 'Atinamos', 'price': 0.005}
    assert 'converted_single_quoted_strings' in payload['repairs']
    assert 'removed_trailing_commas' in payload['repairs']
