SHELL := /usr/bin/env bash
NIGHTLY_TOOLCHAIN := nightly

c:
	cargo build --release --bin surfpool --locked

t:
	@-kill -9 $$(pgrep -x surfpool) 2>/dev/null || true
	@rm -rf .surfpool/
	@./target/release/surfpool start --no-deploy --no-tui & SURFPOOL_PID=$$!; \
	sleep 3; \
	./target/release/surfpool run test -u --env dev; sleep 3;  \

i: 
	npx tsx inspect-acc.ts
