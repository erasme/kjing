all: compact

compact:
	grep '^Core.Util.include(appBase+' kjing-debug.js | \
	sed "s/Core.Util.include(appBase+'\(.*\)');/\1/" | \
	xargs closure-compiler --compilation_level SIMPLE_OPTIMIZATIONS --js_output_file kjing.js --js 

clean:
