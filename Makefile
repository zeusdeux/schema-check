# folders
SRC			= ./src
BUILD		= ./build
NM			= ./node_modules
BIN			= $(NM)/.bin
VIEWS		= $(SRC)/views

# files
MAIN		= $(VIEWS)/main.jsx
MAPFILE = bundle.min.map

all: $(BUILD)/bundle.min.js

$(BUILD)/bundle.min.js: $(BUILD)/bundle.js
	@$(BIN)/uglifyjs $^	\
	-o $@	\
	-c -m	\
	--source-map $(BUILD)/$(MAPFILE)	\
	--source-map-url ./$(MAPFILE)	\
	--comments \
	--stats \

$(BUILD)/bundle.js: $(VIEWS)/* $(NM)/*
	@$(BIN)/browserify -t reactify -t envify $(MAIN) -o $@

clean:
	@$(RM) $(BUILD)/*

.PHONY: all clean

# NODE_ENV=production PORT=8008 DEBUG=state,routes:*,visitor pm2 start -x ./bin/server --name "schema-check"
