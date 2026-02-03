SHELL := /bin/bash

# fnm 環境のセットアップ
define setup_fnm
	export FNM_PATH="$$HOME/.local/share/fnm" && \
	export PATH="$$FNM_PATH:$$PATH" && \
	eval "$$(fnm env)"
endef

.PHONY: install dev build preview test test-watch lint

install:
	@$(setup_fnm) && npm install

dev:
	@$(setup_fnm) && npx vite

build:
	@$(setup_fnm) && npx tsc -b && npx vite build

preview:
	@$(setup_fnm) && npx vite preview

test:
	@$(setup_fnm) && npx vitest run

test-watch:
	@$(setup_fnm) && npx vitest

lint:
	@$(setup_fnm) && npx eslint .
