'use strict';

var qtmrt = {
	HEADER_SIZE_SIZE:         4,
	HEADER_TYPE_SIZE:         4,

	ERROR:                    0,
	COMMAND:                  1,
	XML:                      2,
	DATA:                     3,
	NO_MORE_DATA:             4,
	C3D_FILE:                 5,
	EVENT:                    6,
	DISCOVER:                 7,
	QTM_FILE:                 8,
	COMMAND_RESPONSE:         999,

	CONNECTED:                1,
	CONNECTION_CLOSED:        2,
	CAPTURE_STARTED:          3,
	CAPTURE_STOPPED:          4,
	FETCHING_FINISHED:        5,
	CALIBRATION_STARTED:      6,
	CALIBRATION_STOPPED:      7,
	RT_FROM_FILE_STARTED:     8,
	RT_FROM_FILE_STOPPED:     9,
	WAITING_FOR_TRIGGER:      10,
	CAMERA_SETTINGS_CHANGED:  11,
	QTM_SHUTTING_DOWN:        12,
	CAPTURE_SAVED:            13,

	LITTLE_ENDIAN:            0,
	BIG_ENDIAN:               1,
};

qtmrt.HEADER_SIZE = qtmrt.HEADER_SIZE_SIZE + qtmrt.HEADER_TYPE_SIZE;
qtmrt.byteOrder   = qtmrt.LITTLE_ENDIAN;

module.exports = qtmrt;

