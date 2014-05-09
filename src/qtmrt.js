'use strict';

var qtmrt = {
	HEADER_SIZE_SIZE:  4,
	HEADER_TYPE_SIZE:  4,

	ERROR:             0,
	COMMAND:           1,
	XML:               2,
	DATA:              3,
	NO_MORE_DATA:      4,
	C3D_FILE:          5,
	EVENT:             6,
	DISCOVER:          7,
	QTM_FILE:          8,
	COMMAND_RESPONSE:  999,

	LITTLE_ENDIAN:     0,
	BIG_ENDIAN:        1,
};

qtmrt.HEADER_SIZE = qtmrt.HEADER_SIZE_SIZE + qtmrt.HEADER_TYPE_SIZE;
qtmrt.byteOrder   = qtmrt.LITTLE_ENDIAN;

module.exports = qtmrt;

