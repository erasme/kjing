all: compact

compact:
	grep '^Core.Util.include(appBase+' common-debug.js | \
	sed "s/Core.Util.include(appBase+'\(.*\)');/\1/" | \
	xargs closure-compiler --compilation_level SIMPLE_OPTIMIZATIONS --js_output_file common.js --js

clean:

