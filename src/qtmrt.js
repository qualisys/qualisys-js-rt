'use strict';

class QtmRt {
	static get UINT64_SIZE()                      { return 8; }
	static get UINT32_SIZE()                      { return 4; }
	static get UINT16_SIZE()                      { return 2; }
	static get UINT8_SIZE()                       { return 1; }
	static get FLOAT_SIZE()                       { return 4; }

	static get ERROR()                            { return 0; }
	static get COMMAND()                          { return 1; }
	static get XML()                              { return 2; }
	static get DATA()                             { return 3; }
	static get NO_MORE_DATA()                     { return 4; }
	static get C3D_FILE()                         { return 5; }
	static get EVENT()                            { return 6; }
	static get DISCOVER()                         { return 7; }
	static get QTM_FILE()                         { return 8; }
	static get COMMAND_RESPONSE()                 { return 999; }

	static get CONNECTED()                        { return 1; }
	static get CONNECTION_CLOSED()                { return 2; }
	static get CAPTURE_STARTED()                  { return 3; }
	static get CAPTURE_STOPPED()                  { return 4; }
	static get FETCHING_FINISHED()                { return 5; }
	static get CALIBRATION_STARTED()              { return 6; }
	static get CALIBRATION_STOPPED()              { return 7; }
	static get RT_FROM_FILE_STARTED()             { return 8; }
	static get RT_FROM_FILE_STOPPED()             { return 9; }
	static get WAITING_FOR_TRIGGER()              { return 10; }
	static get CAMERA_SETTINGS_CHANGED()          { return 11; }
	static get QTM_SHUTTING_DOWN()                { return 12; }
	static get CAPTURE_SAVED()                    { return 13; }
	static get TRIGGER()                          { return 16; }

	static get COMPONENT_ALL()                    { return 0; }
	static get COMPONENT_3D()                     { return 1; }
	static get COMPONENT_3D_NO_LABELS()           { return 2; }
	static get COMPONENT_ANALOG()                 { return 3; }
	static get COMPONENT_FORCE()                  { return 4; }
	static get COMPONENT_6D()                     { return 5; }
	static get COMPONENT_6D_EULER()               { return 6; }
	static get COMPONENT_2D()                     { return 7; }
	static get COMPONENT_2D_LINEARIZED()          { return 8; }
	static get COMPONENT_3D_RESIDUALS()           { return 9; }
	static get COMPONENT_3D_NO_LABELS_RESIDUALS() { return 10; }
	static get COMPONENT_6D_RESIDUALS()           { return 11; }
	static get COMPONENT_6D_EULER_RESIDUALS()     { return 12; }
	static get COMPONENT_ANALOG_SINGLE()          { return 13; }
	static get COMPONENT_IMAGE()                  { return 14; }
	static get COMPONENT_FORCE_SINGLE()           { return 15; }
	static get COMPONENT_GAZE_VECTOR()            { return 16; }
	static get COMPONENT_TIMECODE()               { return 17; }
	static get COMPONENT_SKELETON()               { return 18; }
	static get COMPONENT_EYE_TRACKER()            { return 19; }

	static get LITTLE_ENDIAN() { return 'LE'; }
	static get BIG_ENDIAN() { return 'BE'; }

	static get HEADER_SIZE() { return 2 * this.UINT32_SIZE; }

	static get COMPONENTS() {
		return {
			'2D'            : this.COMPONENT_2D,
			'2DLin'         : this.COMPONENT_2D_LINEARIZED,
			'3D'            : this.COMPONENT_3D,
			'3DNoLabels'    : this.COMPONENT_3D_NO_LABELS,
			'3DRes'         : this.COMPONENT_3D_RESIDUALS,
			'3DNoLabelsRes' : this.COMPONENT_3D_NO_LABELS_RESIDUALS,
			'6D'            : this.COMPONENT_6D,
			'6DEuler'       : this.COMPONENT_6D_EULER,
			'6DRes'         : this.COMPONENT_6D_RESIDUALS,
			'6DEulerRes'    : this.COMPONENT_6D_EULER_RESIDUALS,
			'Image'         : this.COMPONENT_IMAGE,
			'Analog'        : this.COMPONENT_ANALOG,
			'AnalogSingle'  : this.COMPONENT_ANALOG_SINGLE,
			'Force'         : this.COMPONENT_FORCE,
			'ForceSingle'   : this.COMPONENT_FORCE_SINGLE,
			'GazeVector'    : this.COMPONENT_GAZE_VECTOR,
			'Timecode'      : this.COMPONENT_TIMECODE,
			'Skeleton'      : this.COMPONENT_SKELETON,
			'EyeTracker'    : this.COMPONENT_EYE_TRACKER,
		};
	}

	constructor() { }

	static eventToString(eventId) {
		var eventNames = {};

		eventNames[this.CONNECTED]               = 'Connected';
		eventNames[this.CONNECTION_CLOSED]       = 'Connection Closed';
		eventNames[this.CAPTURE_STARTED]         = 'Capture Started';
		eventNames[this.CAPTURE_STOPPED]         = 'Capture Stopped';
		eventNames[this.FETCHING_FINISHED]       = 'Fetching Finished';
		eventNames[this.CALIBRATI3ON_STARTED]    = 'Calibration Started';
		eventNames[this.CALIBRATION_STOPPED]     = 'Calibration Stopped';
		eventNames[this.RT_FROM_FILE_STARTED]    = 'RT From File Started';
		eventNames[this.RT_FROM_FILE_STOPPED]    = 'RT From File Stopped';
		eventNames[this.WAITING_FOR_TRIGGER]     = 'Waiting For Trigger';
		eventNames[this.CAMERA_SETTINGS_CHANGED] = 'Camera Settings Changed';
		eventNames[this.QTM_SHUTTING_DOWN]       = 'QTM Shutting Down';
		eventNames[this.CAPTURE_SAVED]           = 'Capture Saved';
		eventNames[this.TRIGGER]                 = 'Trigger';

		return eventNames[eventId];
	}
}

module.exports = QtmRt;