echo we start running full speed
curl -s 'http://scrape.localtest.me:8000/button?action=start' | jq .running; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=state' | jq .status; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=state' | jq .status; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=state' | jq .status; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=state' | jq .status; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=state' | jq .status; sleep 2

echo we stop running full stop
curl -s 'http://scrape.localtest.me:8000/button?action=stop' | jq .running; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=state' | jq .status; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=state' | jq .status; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=state' | jq .status; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=state' | jq .status; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=state' | jq .status; sleep 2

echo we single step for ten steps
curl -s 'http://scrape.localtest.me:8000/button?action=step' | jq .status; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=step' | jq .status; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=step' | jq .status; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=step' | jq .status; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=step' | jq .status; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=step' | jq .status; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=step' | jq .status; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=step' | jq .status; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=step' | jq .status; sleep 2
curl -s 'http://scrape.localtest.me:8000/button?action=step' | jq .status; sleep 2
