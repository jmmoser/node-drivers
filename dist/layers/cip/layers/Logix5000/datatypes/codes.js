// export default Object.freeze({
//   Program: 0x68,
//   Map: 0x69,
//   Routine: 0x6D,
//   Task: 0x70,
//   Cxn: 0x7E,
// });
var Codes;
(function (Codes) {
    Codes[Codes["Program"] = 104] = "Program";
    Codes[Codes["Map"] = 105] = "Map";
    Codes[Codes["Routine"] = 109] = "Routine";
    Codes[Codes["Task"] = 112] = "Task";
    Codes[Codes["Cxn"] = 126] = "Cxn";
})(Codes || (Codes = {}));
export default Codes;
