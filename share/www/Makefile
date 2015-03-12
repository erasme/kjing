all: compact

compact:
	make -f Makefile --directory=era/
	make -f Makefile --directory=common/
	make -f Makefile --directory=admin/
	make -f Makefile --directory=client/
	make -f Makefile --directory=room/

clean:
	make -f Makefile --directory=era/ clean	
	make -f Makefile --directory=common/ clean
	make -f Makefile --directory=admin/ clean
	make -f Makefile --directory=client/ clean
	make -f Makefile --directory=room/ clean


