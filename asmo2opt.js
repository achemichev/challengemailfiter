var Module;
if (!Module)Module = (typeof Module !== "undefined" ? Module : null) || {};
var moduleOverrides = {};
for (var key in Module) {
    if (Module.hasOwnProperty(key)) {
        moduleOverrides[key] = Module[key]
    }
}
var ENVIRONMENT_IS_WEB = typeof window === "object";
var ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
var ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function" && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
if (ENVIRONMENT_IS_NODE) {
    if (!Module["print"])Module["print"] = function print(x) {
        process["stdout"].write(x + "\n")
    };
    if (!Module["printErr"])Module["printErr"] = function printErr(x) {
        process["stderr"].write(x + "\n")
    };
    var nodeFS = require("fs");
    var nodePath = require("path");
    Module["read"] = function read(filename, binary) {
        filename = nodePath["normalize"](filename);
        var ret = nodeFS["readFileSync"](filename);
        if (!ret && filename != nodePath["resolve"](filename)) {
            filename = path.join(__dirname, "..", "src", filename);
            ret = nodeFS["readFileSync"](filename)
        }
        if (ret && !binary)ret = ret.toString();
        return ret
    };
    Module["readBinary"] = function readBinary(filename) {
        var ret = Module["read"](filename, true);
        if (!ret.buffer) {
            ret = new Uint8Array(ret)
        }
        assert(ret.buffer);
        return ret
    };
    Module["load"] = function load(f) {
        globalEval(read(f))
    };
    if (!Module["thisProgram"]) {
        if (process["argv"].length > 1) {
            Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/")
        } else {
            Module["thisProgram"] = "unknown-program"
        }
    }
    Module["arguments"] = process["argv"].slice(2);
    if (typeof module !== "undefined") {
        module["exports"] = Module
    }
    process["on"]("uncaughtException", (function (ex) {
        if (!(ex instanceof ExitStatus)) {
            throw ex
        }
    }));
    Module["inspect"] = (function () {
        return "[Emscripten Module object]"
    })
} else if (ENVIRONMENT_IS_SHELL) {
    if (!Module["print"])Module["print"] = print;
    if (typeof printErr != "undefined")Module["printErr"] = printErr;
    if (typeof read != "undefined") {
        Module["read"] = read
    } else {
        Module["read"] = function read() {
            throw"no read() available (jsc?)"
        }
    }
    Module["readBinary"] = function readBinary(f) {
        if (typeof readbuffer === "function") {
            return new Uint8Array(readbuffer(f))
        }
        var data = read(f, "binary");
        assert(typeof data === "object");
        return data
    };
    if (typeof scriptArgs != "undefined") {
        Module["arguments"] = scriptArgs
    } else if (typeof arguments != "undefined") {
        Module["arguments"] = arguments
    }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    Module["read"] = function read(url) {
        var xhr = new XMLHttpRequest;
        xhr.open("GET", url, false);
        xhr.send(null);
        return xhr.responseText
    };
    if (typeof arguments != "undefined") {
        Module["arguments"] = arguments
    }
    if (typeof console !== "undefined") {
        if (!Module["print"])Module["print"] = function print(x) {
            console.log(x)
        };
        if (!Module["printErr"])Module["printErr"] = function printErr(x) {
            console.log(x)
        }
    } else {
        var TRY_USE_DUMP = false;
        if (!Module["print"])Module["print"] = TRY_USE_DUMP && typeof dump !== "undefined" ? (function (x) {
            dump(x)
        }) : (function (x) {
        })
    }
    if (ENVIRONMENT_IS_WORKER) {
        Module["load"] = importScripts
    }
    if (typeof Module["setWindowTitle"] === "undefined") {
        Module["setWindowTitle"] = (function (title) {
            document.title = title
        })
    }
} else {
    throw"Unknown runtime environment. Where are we?"
}
function globalEval(x) {
    eval.call(null, x)
}
if (!Module["load"] && Module["read"]) {
    Module["load"] = function load(f) {
        globalEval(Module["read"](f))
    }
}
if (!Module["print"]) {
    Module["print"] = (function () {
    })
}
if (!Module["printErr"]) {
    Module["printErr"] = Module["print"]
}
if (!Module["arguments"]) {
    Module["arguments"] = []
}
if (!Module["thisProgram"]) {
    Module["thisProgram"] = "./this.program"
}
Module.print = Module["print"];
Module.printErr = Module["printErr"];
Module["preRun"] = [];
Module["postRun"] = [];
for (var key in moduleOverrides) {
    if (moduleOverrides.hasOwnProperty(key)) {
        Module[key] = moduleOverrides[key]
    }
}
var Runtime = {
    setTempRet0: (function (value) {
        tempRet0 = value
    }), getTempRet0: (function () {
        return tempRet0
    }), stackSave: (function () {
        return STACKTOP
    }), stackRestore: (function (stackTop) {
        STACKTOP = stackTop
    }), getNativeTypeSize: (function (type) {
        switch (type) {
            case"i1":
            case"i8":
                return 1;
            case"i16":
                return 2;
            case"i32":
                return 4;
            case"i64":
                return 8;
            case"float":
                return 4;
            case"double":
                return 8;
            default:
            {
                if (type[type.length - 1] === "*") {
                    return Runtime.QUANTUM_SIZE
                } else if (type[0] === "i") {
                    var bits = parseInt(type.substr(1));
                    assert(bits % 8 === 0);
                    return bits / 8
                } else {
                    return 0
                }
            }
        }
    }), getNativeFieldSize: (function (type) {
        return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE)
    }), STACK_ALIGN: 16, prepVararg: (function (ptr, type) {
        if (type === "double" || type === "i64") {
            if (ptr & 7) {
                assert((ptr & 7) === 4);
                ptr += 4
            }
        } else {
            assert((ptr & 3) === 0)
        }
        return ptr
    }), getAlignSize: (function (type, size, vararg) {
        if (!vararg && (type == "i64" || type == "double"))return 8;
        if (!type)return Math.min(size, 8);
        return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE)
    }), dynCall: (function (sig, ptr, args) {
        if (args && args.length) {
            if (!args.splice)args = Array.prototype.slice.call(args);
            args.splice(0, 0, ptr);
            return Module["dynCall_" + sig].apply(null, args)
        } else {
            return Module["dynCall_" + sig].call(null, ptr)
        }
    }), functionPointers: [], addFunction: (function (func) {
        for (var i = 0; i < Runtime.functionPointers.length; i++) {
            if (!Runtime.functionPointers[i]) {
                Runtime.functionPointers[i] = func;
                return 2 * (1 + i)
            }
        }
        throw"Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS."
    }), removeFunction: (function (index) {
        Runtime.functionPointers[(index - 2) / 2] = null
    }), warnOnce: (function (text) {
        if (!Runtime.warnOnce.shown)Runtime.warnOnce.shown = {};
        if (!Runtime.warnOnce.shown[text]) {
            Runtime.warnOnce.shown[text] = 1;
            Module.printErr(text)
        }
    }), funcWrappers: {}, getFuncWrapper: (function (func, sig) {
        assert(sig);
        if (!Runtime.funcWrappers[sig]) {
            Runtime.funcWrappers[sig] = {}
        }
        var sigCache = Runtime.funcWrappers[sig];
        if (!sigCache[func]) {
            sigCache[func] = function dynCall_wrapper() {
                return Runtime.dynCall(sig, func, arguments)
            }
        }
        return sigCache[func]
    }), getCompilerSetting: (function (name) {
        throw"You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work"
    }), stackAlloc: (function (size) {
        var ret = STACKTOP;
        STACKTOP = STACKTOP + size | 0;
        STACKTOP = STACKTOP + 15 & -16;
        return ret
    }), staticAlloc: (function (size) {
        var ret = STATICTOP;
        STATICTOP = STATICTOP + size | 0;
        STATICTOP = STATICTOP + 15 & -16;
        return ret
    }), dynamicAlloc: (function (size) {
        var ret = DYNAMICTOP;
        DYNAMICTOP = DYNAMICTOP + size | 0;
        DYNAMICTOP = DYNAMICTOP + 15 & -16;
        if (DYNAMICTOP >= TOTAL_MEMORY) {
            var success = enlargeMemory();
            if (!success) {
                DYNAMICTOP = ret;
                return 0
            }
        }
        return ret
    }), alignMemory: (function (size, quantum) {
        var ret = size = Math.ceil(size / (quantum ? quantum : 16)) * (quantum ? quantum : 16);
        return ret
    }), makeBigInt: (function (low, high, unsigned) {
        var ret = unsigned ? +(low >>> 0) + +(high >>> 0) * +4294967296 : +(low >>> 0) + +(high | 0) * +4294967296;
        return ret
    }), GLOBAL_BASE: 8, QUANTUM_SIZE: 4, __dummy__: 0
};
Module["Runtime"] = Runtime;
var __THREW__ = 0;
var ABORT = false;
var EXITSTATUS = 0;
var undef = 0;
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;
function assert(condition, text) {
    if (!condition) {
        abort("Assertion failed: " + text)
    }
}
var globalScope = this;
function getCFunc(ident) {
    var func = Module["_" + ident];
    if (!func) {
        try {
            func = eval("_" + ident)
        } catch (e) {
        }
    }
    assert(func, "Cannot call unknown function " + ident + " (perhaps LLVM optimizations or closure removed it?)");
    return func
}
var cwrap, ccall;
((function () {
    var JSfuncs = {
        "stackSave": (function () {
            Runtime.stackSave()
        }), "stackRestore": (function () {
            Runtime.stackRestore()
        }), "arrayToC": (function (arr) {
            var ret = Runtime.stackAlloc(arr.length);
            writeArrayToMemory(arr, ret);
            return ret
        }), "stringToC": (function (str) {
            var ret = 0;
            if (str !== null && str !== undefined && str !== 0) {
                ret = Runtime.stackAlloc((str.length << 2) + 1);
                writeStringToMemory(str, ret)
            }
            return ret
        })
    };
    var toC = {"string": JSfuncs["stringToC"], "array": JSfuncs["arrayToC"]};
    ccall = function ccallFunc(ident, returnType, argTypes, args, opts) {
        var func = getCFunc(ident);
        var cArgs = [];
        var stack = 0;
        if (args) {
            for (var i = 0; i < args.length; i++) {
                var converter = toC[argTypes[i]];
                if (converter) {
                    if (stack === 0)stack = Runtime.stackSave();
                    cArgs[i] = converter(args[i])
                } else {
                    cArgs[i] = args[i]
                }
            }
        }
        var ret = func.apply(null, cArgs);
        if (returnType === "string")ret = Pointer_stringify(ret);
        if (stack !== 0) {
            if (opts && opts.async) {
                EmterpreterAsync.asyncFinalizers.push((function () {
                    Runtime.stackRestore(stack)
                }));
                return
            }
            Runtime.stackRestore(stack)
        }
        return ret
    };
    var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;

    function parseJSFunc(jsfunc) {
        var parsed = jsfunc.toString().match(sourceRegex).slice(1);
        return {arguments: parsed[0], body: parsed[1], returnValue: parsed[2]}
    }

    var JSsource = {};
    for (var fun in JSfuncs) {
        if (JSfuncs.hasOwnProperty(fun)) {
            JSsource[fun] = parseJSFunc(JSfuncs[fun])
        }
    }
    cwrap = function cwrap(ident, returnType, argTypes) {
        argTypes = argTypes || [];
        var cfunc = getCFunc(ident);
        var numericArgs = argTypes.every((function (type) {
            return type === "number"
        }));
        var numericRet = returnType !== "string";
        if (numericRet && numericArgs) {
            return cfunc
        }
        var argNames = argTypes.map((function (x, i) {
            return "$" + i
        }));
        var funcstr = "(function(" + argNames.join(",") + ") {";
        var nargs = argTypes.length;
        if (!numericArgs) {
            funcstr += "var stack = " + JSsource["stackSave"].body + ";";
            for (var i = 0; i < nargs; i++) {
                var arg = argNames[i], type = argTypes[i];
                if (type === "number")continue;
                var convertCode = JSsource[type + "ToC"];
                funcstr += "var " + convertCode.arguments + " = " + arg + ";";
                funcstr += convertCode.body + ";";
                funcstr += arg + "=" + convertCode.returnValue + ";"
            }
        }
        var cfuncname = parseJSFunc((function () {
            return cfunc
        })).returnValue;
        funcstr += "var ret = " + cfuncname + "(" + argNames.join(",") + ");";
        if (!numericRet) {
            var strgfy = parseJSFunc((function () {
                return Pointer_stringify
            })).returnValue;
            funcstr += "ret = " + strgfy + "(ret);"
        }
        if (!numericArgs) {
            funcstr += JSsource["stackRestore"].body.replace("()", "(stack)") + ";"
        }
        funcstr += "return ret})";
        return eval(funcstr)
    }
}))();
Module["ccall"] = ccall;
Module["cwrap"] = cwrap;
function setValue(ptr, value, type, noSafe) {
    type = type || "i8";
    if (type.charAt(type.length - 1) === "*")type = "i32";
    switch (type) {
        case"i1":
            HEAP8[ptr >> 0] = value;
            break;
        case"i8":
            HEAP8[ptr >> 0] = value;
            break;
        case"i16":
            HEAP16[ptr >> 1] = value;
            break;
        case"i32":
            HEAP32[ptr >> 2] = value;
            break;
        case"i64":
            tempI64 = [value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= +1 ? tempDouble > +0 ? (Math_min(+Math_floor(tempDouble / +4294967296), +4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / +4294967296) >>> 0 : 0)], HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
            break;
        case"float":
            HEAPF32[ptr >> 2] = value;
            break;
        case"double":
            HEAPF64[ptr >> 3] = value;
            break;
        default:
            abort("invalid type for setValue: " + type)
    }
}
Module["setValue"] = setValue;
function getValue(ptr, type, noSafe) {
    type = type || "i8";
    if (type.charAt(type.length - 1) === "*")type = "i32";
    switch (type) {
        case"i1":
            return HEAP8[ptr >> 0];
        case"i8":
            return HEAP8[ptr >> 0];
        case"i16":
            return HEAP16[ptr >> 1];
        case"i32":
            return HEAP32[ptr >> 2];
        case"i64":
            return HEAP32[ptr >> 2];
        case"float":
            return HEAPF32[ptr >> 2];
        case"double":
            return HEAPF64[ptr >> 3];
        default:
            abort("invalid type for setValue: " + type)
    }
    return null
}
Module["getValue"] = getValue;
var ALLOC_NORMAL = 0;
var ALLOC_STACK = 1;
var ALLOC_STATIC = 2;
var ALLOC_DYNAMIC = 3;
var ALLOC_NONE = 4;
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;
function allocate(slab, types, allocator, ptr) {
    var zeroinit, size;
    if (typeof slab === "number") {
        zeroinit = true;
        size = slab
    } else {
        zeroinit = false;
        size = slab.length
    }
    var singleType = typeof types === "string" ? types : null;
    var ret;
    if (allocator == ALLOC_NONE) {
        ret = ptr
    } else {
        ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length))
    }
    if (zeroinit) {
        var ptr = ret, stop;
        assert((ret & 3) == 0);
        stop = ret + (size & ~3);
        for (; ptr < stop; ptr += 4) {
            HEAP32[ptr >> 2] = 0
        }
        stop = ret + size;
        while (ptr < stop) {
            HEAP8[ptr++ >> 0] = 0
        }
        return ret
    }
    if (singleType === "i8") {
        if (slab.subarray || slab.slice) {
            HEAPU8.set(slab, ret)
        } else {
            HEAPU8.set(new Uint8Array(slab), ret)
        }
        return ret
    }
    var i = 0, type, typeSize, previousType;
    while (i < size) {
        var curr = slab[i];
        if (typeof curr === "function") {
            curr = Runtime.getFunctionIndex(curr)
        }
        type = singleType || types[i];
        if (type === 0) {
            i++;
            continue
        }
        if (type == "i64")type = "i32";
        setValue(ret + i, curr, type);
        if (previousType !== type) {
            typeSize = Runtime.getNativeTypeSize(type);
            previousType = type
        }
        i += typeSize
    }
    return ret
}
Module["allocate"] = allocate;
function getMemory(size) {
    if (!staticSealed)return Runtime.staticAlloc(size);
    if (typeof _sbrk !== "undefined" && !_sbrk.called || !runtimeInitialized)return Runtime.dynamicAlloc(size);
    return _malloc(size)
}
Module["getMemory"] = getMemory;
function Pointer_stringify(ptr, length) {
    if (length === 0 || !ptr)return "";
    var hasUtf = 0;
    var t;
    var i = 0;
    while (1) {
        t = HEAPU8[ptr + i >> 0];
        hasUtf |= t;
        if (t == 0 && !length)break;
        i++;
        if (length && i == length)break
    }
    if (!length)length = i;
    var ret = "";
    if (hasUtf < 128) {
        var MAX_CHUNK = 1024;
        var curr;
        while (length > 0) {
            curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
            ret = ret ? ret + curr : curr;
            ptr += MAX_CHUNK;
            length -= MAX_CHUNK
        }
        return ret
    }
    return Module["UTF8ToString"](ptr)
}
Module["Pointer_stringify"] = Pointer_stringify;
function AsciiToString(ptr) {
    var str = "";
    while (1) {
        var ch = HEAP8[ptr++ >> 0];
        if (!ch)return str;
        str += String.fromCharCode(ch)
    }
}
Module["AsciiToString"] = AsciiToString;
function stringToAscii(str, outPtr) {
    return writeAsciiToMemory(str, outPtr, false)
}
Module["stringToAscii"] = stringToAscii;
function UTF8ArrayToString(u8Array, idx) {
    var u0, u1, u2, u3, u4, u5;
    var str = "";
    while (1) {
        u0 = u8Array[idx++];
        if (!u0)return str;
        if (!(u0 & 128)) {
            str += String.fromCharCode(u0);
            continue
        }
        u1 = u8Array[idx++] & 63;
        if ((u0 & 224) == 192) {
            str += String.fromCharCode((u0 & 31) << 6 | u1);
            continue
        }
        u2 = u8Array[idx++] & 63;
        if ((u0 & 240) == 224) {
            u0 = (u0 & 15) << 12 | u1 << 6 | u2
        } else {
            u3 = u8Array[idx++] & 63;
            if ((u0 & 248) == 240) {
                u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u3
            } else {
                u4 = u8Array[idx++] & 63;
                if ((u0 & 252) == 248) {
                    u0 = (u0 & 3) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4
                } else {
                    u5 = u8Array[idx++] & 63;
                    u0 = (u0 & 1) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5
                }
            }
        }
        if (u0 < 65536) {
            str += String.fromCharCode(u0)
        } else {
            var ch = u0 - 65536;
            str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
        }
    }
}
Module["UTF8ArrayToString"] = UTF8ArrayToString;
function UTF8ToString(ptr) {
    return UTF8ArrayToString(HEAPU8, ptr)
}
Module["UTF8ToString"] = UTF8ToString;
function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
    if (!(maxBytesToWrite > 0))return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343)u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
        if (u <= 127) {
            if (outIdx >= endIdx)break;
            outU8Array[outIdx++] = u
        } else if (u <= 2047) {
            if (outIdx + 1 >= endIdx)break;
            outU8Array[outIdx++] = 192 | u >> 6;
            outU8Array[outIdx++] = 128 | u & 63
        } else if (u <= 65535) {
            if (outIdx + 2 >= endIdx)break;
            outU8Array[outIdx++] = 224 | u >> 12;
            outU8Array[outIdx++] = 128 | u >> 6 & 63;
            outU8Array[outIdx++] = 128 | u & 63
        } else if (u <= 2097151) {
            if (outIdx + 3 >= endIdx)break;
            outU8Array[outIdx++] = 240 | u >> 18;
            outU8Array[outIdx++] = 128 | u >> 12 & 63;
            outU8Array[outIdx++] = 128 | u >> 6 & 63;
            outU8Array[outIdx++] = 128 | u & 63
        } else if (u <= 67108863) {
            if (outIdx + 4 >= endIdx)break;
            outU8Array[outIdx++] = 248 | u >> 24;
            outU8Array[outIdx++] = 128 | u >> 18 & 63;
            outU8Array[outIdx++] = 128 | u >> 12 & 63;
            outU8Array[outIdx++] = 128 | u >> 6 & 63;
            outU8Array[outIdx++] = 128 | u & 63
        } else {
            if (outIdx + 5 >= endIdx)break;
            outU8Array[outIdx++] = 252 | u >> 30;
            outU8Array[outIdx++] = 128 | u >> 24 & 63;
            outU8Array[outIdx++] = 128 | u >> 18 & 63;
            outU8Array[outIdx++] = 128 | u >> 12 & 63;
            outU8Array[outIdx++] = 128 | u >> 6 & 63;
            outU8Array[outIdx++] = 128 | u & 63
        }
    }
    outU8Array[outIdx] = 0;
    return outIdx - startIdx
}
Module["stringToUTF8Array"] = stringToUTF8Array;
function stringToUTF8(str, outPtr, maxBytesToWrite) {
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
}
Module["stringToUTF8"] = stringToUTF8;
function lengthBytesUTF8(str) {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
        var u = str.charCodeAt(i);
        if (u >= 55296 && u <= 57343)u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
        if (u <= 127) {
            ++len
        } else if (u <= 2047) {
            len += 2
        } else if (u <= 65535) {
            len += 3
        } else if (u <= 2097151) {
            len += 4
        } else if (u <= 67108863) {
            len += 5
        } else {
            len += 6
        }
    }
    return len
}
Module["lengthBytesUTF8"] = lengthBytesUTF8;
function UTF16ToString(ptr) {
    var i = 0;
    var str = "";
    while (1) {
        var codeUnit = HEAP16[ptr + i * 2 >> 1];
        if (codeUnit == 0)return str;
        ++i;
        str += String.fromCharCode(codeUnit)
    }
}
Module["UTF16ToString"] = UTF16ToString;
function stringToUTF16(str, outPtr, maxBytesToWrite) {
    if (maxBytesToWrite === undefined) {
        maxBytesToWrite = 2147483647
    }
    if (maxBytesToWrite < 2)return 0;
    maxBytesToWrite -= 2;
    var startPtr = outPtr;
    var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
    for (var i = 0; i < numCharsToWrite; ++i) {
        var codeUnit = str.charCodeAt(i);
        HEAP16[outPtr >> 1] = codeUnit;
        outPtr += 2
    }
    HEAP16[outPtr >> 1] = 0;
    return outPtr - startPtr
}
Module["stringToUTF16"] = stringToUTF16;
function lengthBytesUTF16(str) {
    return str.length * 2
}
Module["lengthBytesUTF16"] = lengthBytesUTF16;
function UTF32ToString(ptr) {
    var i = 0;
    var str = "";
    while (1) {
        var utf32 = HEAP32[ptr + i * 4 >> 2];
        if (utf32 == 0)return str;
        ++i;
        if (utf32 >= 65536) {
            var ch = utf32 - 65536;
            str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
        } else {
            str += String.fromCharCode(utf32)
        }
    }
}
Module["UTF32ToString"] = UTF32ToString;
function stringToUTF32(str, outPtr, maxBytesToWrite) {
    if (maxBytesToWrite === undefined) {
        maxBytesToWrite = 2147483647
    }
    if (maxBytesToWrite < 4)return 0;
    var startPtr = outPtr;
    var endPtr = startPtr + maxBytesToWrite - 4;
    for (var i = 0; i < str.length; ++i) {
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 55296 && codeUnit <= 57343) {
            var trailSurrogate = str.charCodeAt(++i);
            codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023
        }
        HEAP32[outPtr >> 2] = codeUnit;
        outPtr += 4;
        if (outPtr + 4 > endPtr)break
    }
    HEAP32[outPtr >> 2] = 0;
    return outPtr - startPtr
}
Module["stringToUTF32"] = stringToUTF32;
function lengthBytesUTF32(str) {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
        var codeUnit = str.charCodeAt(i);
        if (codeUnit >= 55296 && codeUnit <= 57343)++i;
        len += 4
    }
    return len
}
Module["lengthBytesUTF32"] = lengthBytesUTF32;
function demangle(func) {
    var hasLibcxxabi = !!Module["___cxa_demangle"];
    if (hasLibcxxabi) {
        try {
            var buf = _malloc(func.length);
            writeStringToMemory(func.substr(1), buf);
            var status = _malloc(4);
            var ret = Module["___cxa_demangle"](buf, 0, 0, status);
            if (getValue(status, "i32") === 0 && ret) {
                return Pointer_stringify(ret)
            }
        } catch (e) {
        } finally {
            if (buf)_free(buf);
            if (status)_free(status);
            if (ret)_free(ret)
        }
    }
    var i = 3;
    var basicTypes = {
        "v": "void",
        "b": "bool",
        "c": "char",
        "s": "short",
        "i": "int",
        "l": "long",
        "f": "float",
        "d": "double",
        "w": "wchar_t",
        "a": "signed char",
        "h": "unsigned char",
        "t": "unsigned short",
        "j": "unsigned int",
        "m": "unsigned long",
        "x": "long long",
        "y": "unsigned long long",
        "z": "..."
    };
    var subs = [];
    var first = true;

    function dump(x) {
        if (x)Module.print(x);
        Module.print(func);
        var pre = "";
        for (var a = 0; a < i; a++)pre += " ";
        Module.print(pre + "^")
    }

    function parseNested() {
        i++;
        if (func[i] === "K")i++;
        var parts = [];
        while (func[i] !== "E") {
            if (func[i] === "S") {
                i++;
                var next = func.indexOf("_", i);
                var num = func.substring(i, next) || 0;
                parts.push(subs[num] || "?");
                i = next + 1;
                continue
            }
            if (func[i] === "C") {
                parts.push(parts[parts.length - 1]);
                i += 2;
                continue
            }
            var size = parseInt(func.substr(i));
            var pre = size.toString().length;
            if (!size || !pre) {
                i--;
                break
            }
            var curr = func.substr(i + pre, size);
            parts.push(curr);
            subs.push(curr);
            i += pre + size
        }
        i++;
        return parts
    }

    function parse(rawList, limit, allowVoid) {
        limit = limit || Infinity;
        var ret = "", list = [];

        function flushList() {
            return "(" + list.join(", ") + ")"
        }

        var name;
        if (func[i] === "N") {
            name = parseNested().join("::");
            limit--;
            if (limit === 0)return rawList ? [name] : name
        } else {
            if (func[i] === "K" || first && func[i] === "L")i++;
            var size = parseInt(func.substr(i));
            if (size) {
                var pre = size.toString().length;
                name = func.substr(i + pre, size);
                i += pre + size
            }
        }
        first = false;
        if (func[i] === "I") {
            i++;
            var iList = parse(true);
            var iRet = parse(true, 1, true);
            ret += iRet[0] + " " + name + "<" + iList.join(", ") + ">"
        } else {
            ret = name
        }
        paramLoop:while (i < func.length && limit-- > 0) {
            var c = func[i++];
            if (c in basicTypes) {
                list.push(basicTypes[c])
            } else {
                switch (c) {
                    case"P":
                        list.push(parse(true, 1, true)[0] + "*");
                        break;
                    case"R":
                        list.push(parse(true, 1, true)[0] + "&");
                        break;
                    case"L":
                    {
                        i++;
                        var end = func.indexOf("E", i);
                        var size = end - i;
                        list.push(func.substr(i, size));
                        i += size + 2;
                        break
                    }
                        ;
                    case"A":
                    {
                        var size = parseInt(func.substr(i));
                        i += size.toString().length;
                        if (func[i] !== "_")throw"?";
                        i++;
                        list.push(parse(true, 1, true)[0] + " [" + size + "]");
                        break
                    }
                        ;
                    case"E":
                        break paramLoop;
                    default:
                        ret += "?" + c;
                        break paramLoop
                }
            }
        }
        if (!allowVoid && list.length === 1 && list[0] === "void")list = [];
        if (rawList) {
            if (ret) {
                list.push(ret + "?")
            }
            return list
        } else {
            return ret + flushList()
        }
    }

    var parsed = func;
    try {
        if (func == "Object._main" || func == "_main") {
            return "main()"
        }
        if (typeof func === "number")func = Pointer_stringify(func);
        if (func[0] !== "_")return func;
        if (func[1] !== "_")return func;
        if (func[2] !== "Z")return func;
        switch (func[3]) {
            case"n":
                return "operator new()";
            case"d":
                return "operator delete()"
        }
        parsed = parse()
    } catch (e) {
        parsed += "?"
    }
    if (parsed.indexOf("?") >= 0 && !hasLibcxxabi) {
        Runtime.warnOnce("warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling")
    }
    return parsed
}
function demangleAll(text) {
    return text.replace(/__Z[\w\d_]+/g, (function (x) {
        var y = demangle(x);
        return x === y ? x : x + " [" + y + "]"
    }))
}
function jsStackTrace() {
    var err = new Error;
    if (!err.stack) {
        try {
            throw new Error(0)
        } catch (e) {
            err = e
        }
        if (!err.stack) {
            return "(no stack trace available)"
        }
    }
    return err.stack.toString()
}
function stackTrace() {
    return demangleAll(jsStackTrace())
}
Module["stackTrace"] = stackTrace;
var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
    if (x % 4096 > 0) {
        x += 4096 - x % 4096
    }
    return x
}
var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false;
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0;
var DYNAMIC_BASE = 0, DYNAMICTOP = 0;
function abortOnCannotGrowMemory() {
    abort("Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value " + TOTAL_MEMORY + ", (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which adjusts the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ")
}
function enlargeMemory() {
    abortOnCannotGrowMemory()
}
var TOTAL_STACK = Module["TOTAL_STACK"] || 5242880;
var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 16777216;
var totalMemory = 64 * 1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2 * TOTAL_STACK) {
    if (totalMemory < 16 * 1024 * 1024) {
        totalMemory *= 2
    } else {
        totalMemory += 16 * 1024 * 1024
    }
}
if (totalMemory !== TOTAL_MEMORY) {
    TOTAL_MEMORY = totalMemory
}
assert(typeof Int32Array !== "undefined" && typeof Float64Array !== "undefined" && !!(new Int32Array(1))["subarray"] && !!(new Int32Array(1))["set"], "JS engine does not provide full typed array support");
var buffer;
buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, "Typed arrays 2 must be run on a little-endian system");
Module["HEAP"] = HEAP;
Module["buffer"] = buffer;
Module["HEAP8"] = HEAP8;
Module["HEAP16"] = HEAP16;
Module["HEAP32"] = HEAP32;
Module["HEAPU8"] = HEAPU8;
Module["HEAPU16"] = HEAPU16;
Module["HEAPU32"] = HEAPU32;
Module["HEAPF32"] = HEAPF32;
Module["HEAPF64"] = HEAPF64;
function callRuntimeCallbacks(callbacks) {
    while (callbacks.length > 0) {
        var callback = callbacks.shift();
        if (typeof callback == "function") {
            callback();
            continue
        }
        var func = callback.func;
        if (typeof func === "number") {
            if (callback.arg === undefined) {
                Runtime.dynCall("v", func)
            } else {
                Runtime.dynCall("vi", func, [callback.arg])
            }
        } else {
            func(callback.arg === undefined ? null : callback.arg)
        }
    }
}
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATEXIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;
function preRun() {
    if (Module["preRun"]) {
        if (typeof Module["preRun"] == "function")Module["preRun"] = [Module["preRun"]];
        while (Module["preRun"].length) {
            addOnPreRun(Module["preRun"].shift())
        }
    }
    callRuntimeCallbacks(__ATPRERUN__)
}
function ensureInitRuntime() {
    if (runtimeInitialized)return;
    runtimeInitialized = true;
    callRuntimeCallbacks(__ATINIT__)
}
function preMain() {
    callRuntimeCallbacks(__ATMAIN__)
}
function exitRuntime() {
    callRuntimeCallbacks(__ATEXIT__);
    runtimeExited = true
}
function postRun() {
    if (Module["postRun"]) {
        if (typeof Module["postRun"] == "function")Module["postRun"] = [Module["postRun"]];
        while (Module["postRun"].length) {
            addOnPostRun(Module["postRun"].shift())
        }
    }
    callRuntimeCallbacks(__ATPOSTRUN__)
}
function addOnPreRun(cb) {
    __ATPRERUN__.unshift(cb)
}
Module["addOnPreRun"] = addOnPreRun;
function addOnInit(cb) {
    __ATINIT__.unshift(cb)
}
Module["addOnInit"] = addOnInit;
function addOnPreMain(cb) {
    __ATMAIN__.unshift(cb)
}
Module["addOnPreMain"] = addOnPreMain;
function addOnExit(cb) {
    __ATEXIT__.unshift(cb)
}
Module["addOnExit"] = addOnExit;
function addOnPostRun(cb) {
    __ATPOSTRUN__.unshift(cb)
}
Module["addOnPostRun"] = addOnPostRun;
function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull)u8array.length = numBytesWritten;
    return u8array
}
Module["intArrayFromString"] = intArrayFromString;
function intArrayToString(array) {
    var ret = [];
    for (var i = 0; i < array.length; i++) {
        var chr = array[i];
        if (chr > 255) {
            chr &= 255
        }
        ret.push(String.fromCharCode(chr))
    }
    return ret.join("")
}
Module["intArrayToString"] = intArrayToString;
function writeStringToMemory(string, buffer, dontAddNull) {
    var array = intArrayFromString(string, dontAddNull);
    var i = 0;
    while (i < array.length) {
        var chr = array[i];
        HEAP8[buffer + i >> 0] = chr;
        i = i + 1
    }
}
Module["writeStringToMemory"] = writeStringToMemory;
function writeArrayToMemory(array, buffer) {
    for (var i = 0; i < array.length; i++) {
        HEAP8[buffer++ >> 0] = array[i]
    }
}
Module["writeArrayToMemory"] = writeArrayToMemory;
function writeAsciiToMemory(str, buffer, dontAddNull) {
    for (var i = 0; i < str.length; ++i) {
        HEAP8[buffer++ >> 0] = str.charCodeAt(i)
    }
    if (!dontAddNull)HEAP8[buffer >> 0] = 0
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;
function unSign(value, bits, ignore) {
    if (value >= 0) {
        return value
    }
    return bits <= 32 ? 2 * Math.abs(1 << bits - 1) + value : Math.pow(2, bits) + value
}
function reSign(value, bits, ignore) {
    if (value <= 0) {
        return value
    }
    var half = bits <= 32 ? Math.abs(1 << bits - 1) : Math.pow(2, bits - 1);
    if (value >= half && (bits <= 32 || value > half)) {
        value = -2 * half + value
    }
    return value
}
if (!Math["imul"] || Math["imul"](4294967295, 5) !== -5)Math["imul"] = function imul(a, b) {
    var ah = a >>> 16;
    var al = a & 65535;
    var bh = b >>> 16;
    var bl = b & 65535;
    return al * bl + (ah * bl + al * bh << 16) | 0
};
Math.imul = Math["imul"];
if (!Math["clz32"])Math["clz32"] = (function (x) {
    x = x >>> 0;
    for (var i = 0; i < 32; i++) {
        if (x & 1 << 31 - i)return i
    }
    return 32
});
Math.clz32 = Math["clz32"];
var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;
function getUniqueRunDependency(id) {
    return id
}
function addRunDependency(id) {
    runDependencies++;
    if (Module["monitorRunDependencies"]) {
        Module["monitorRunDependencies"](runDependencies)
    }
}
Module["addRunDependency"] = addRunDependency;
function removeRunDependency(id) {
    runDependencies--;
    if (Module["monitorRunDependencies"]) {
        Module["monitorRunDependencies"](runDependencies)
    }
    if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null
        }
        if (dependenciesFulfilled) {
            var callback = dependenciesFulfilled;
            dependenciesFulfilled = null;
            callback()
        }
    }
}
Module["removeRunDependency"] = removeRunDependency;
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};
var memoryInitializer = null;
var ASM_CONSTS = [];
STATIC_BASE = 8;
STATICTOP = STATIC_BASE + 1696;
__ATINIT__.push();
allocate([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 164, 2, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 255, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "i8", ALLOC_NONE, Runtime.GLOBAL_BASE);
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);
assert(tempDoublePtr % 8 == 0);
function copyTempFloat(ptr) {
    HEAP8[tempDoublePtr] = HEAP8[ptr];
    HEAP8[tempDoublePtr + 1] = HEAP8[ptr + 1];
    HEAP8[tempDoublePtr + 2] = HEAP8[ptr + 2];
    HEAP8[tempDoublePtr + 3] = HEAP8[ptr + 3]
}
function copyTempDouble(ptr) {
    HEAP8[tempDoublePtr] = HEAP8[ptr];
    HEAP8[tempDoublePtr + 1] = HEAP8[ptr + 1];
    HEAP8[tempDoublePtr + 2] = HEAP8[ptr + 2];
    HEAP8[tempDoublePtr + 3] = HEAP8[ptr + 3];
    HEAP8[tempDoublePtr + 4] = HEAP8[ptr + 4];
    HEAP8[tempDoublePtr + 5] = HEAP8[ptr + 5];
    HEAP8[tempDoublePtr + 6] = HEAP8[ptr + 6];
    HEAP8[tempDoublePtr + 7] = HEAP8[ptr + 7]
}
function ___setErrNo(value) {
    if (Module["___errno_location"])HEAP32[Module["___errno_location"]() >> 2] = value;
    return value
}
var ERRNO_CODES = {
    EPERM: 1,
    ENOENT: 2,
    ESRCH: 3,
    EINTR: 4,
    EIO: 5,
    ENXIO: 6,
    E2BIG: 7,
    ENOEXEC: 8,
    EBADF: 9,
    ECHILD: 10,
    EAGAIN: 11,
    EWOULDBLOCK: 11,
    ENOMEM: 12,
    EACCES: 13,
    EFAULT: 14,
    ENOTBLK: 15,
    EBUSY: 16,
    EEXIST: 17,
    EXDEV: 18,
    ENODEV: 19,
    ENOTDIR: 20,
    EISDIR: 21,
    EINVAL: 22,
    ENFILE: 23,
    EMFILE: 24,
    ENOTTY: 25,
    ETXTBSY: 26,
    EFBIG: 27,
    ENOSPC: 28,
    ESPIPE: 29,
    EROFS: 30,
    EMLINK: 31,
    EPIPE: 32,
    EDOM: 33,
    ERANGE: 34,
    ENOMSG: 42,
    EIDRM: 43,
    ECHRNG: 44,
    EL2NSYNC: 45,
    EL3HLT: 46,
    EL3RST: 47,
    ELNRNG: 48,
    EUNATCH: 49,
    ENOCSI: 50,
    EL2HLT: 51,
    EDEADLK: 35,
    ENOLCK: 37,
    EBADE: 52,
    EBADR: 53,
    EXFULL: 54,
    ENOANO: 55,
    EBADRQC: 56,
    EBADSLT: 57,
    EDEADLOCK: 35,
    EBFONT: 59,
    ENOSTR: 60,
    ENODATA: 61,
    ETIME: 62,
    ENOSR: 63,
    ENONET: 64,
    ENOPKG: 65,
    EREMOTE: 66,
    ENOLINK: 67,
    EADV: 68,
    ESRMNT: 69,
    ECOMM: 70,
    EPROTO: 71,
    EMULTIHOP: 72,
    EDOTDOT: 73,
    EBADMSG: 74,
    ENOTUNIQ: 76,
    EBADFD: 77,
    EREMCHG: 78,
    ELIBACC: 79,
    ELIBBAD: 80,
    ELIBSCN: 81,
    ELIBMAX: 82,
    ELIBEXEC: 83,
    ENOSYS: 38,
    ENOTEMPTY: 39,
    ENAMETOOLONG: 36,
    ELOOP: 40,
    EOPNOTSUPP: 95,
    EPFNOSUPPORT: 96,
    ECONNRESET: 104,
    ENOBUFS: 105,
    EAFNOSUPPORT: 97,
    EPROTOTYPE: 91,
    ENOTSOCK: 88,
    ENOPROTOOPT: 92,
    ESHUTDOWN: 108,
    ECONNREFUSED: 111,
    EADDRINUSE: 98,
    ECONNABORTED: 103,
    ENETUNREACH: 101,
    ENETDOWN: 100,
    ETIMEDOUT: 110,
    EHOSTDOWN: 112,
    EHOSTUNREACH: 113,
    EINPROGRESS: 115,
    EALREADY: 114,
    EDESTADDRREQ: 89,
    EMSGSIZE: 90,
    EPROTONOSUPPORT: 93,
    ESOCKTNOSUPPORT: 94,
    EADDRNOTAVAIL: 99,
    ENETRESET: 102,
    EISCONN: 106,
    ENOTCONN: 107,
    ETOOMANYREFS: 109,
    EUSERS: 87,
    EDQUOT: 122,
    ESTALE: 116,
    ENOTSUP: 95,
    ENOMEDIUM: 123,
    EILSEQ: 84,
    EOVERFLOW: 75,
    ECANCELED: 125,
    ENOTRECOVERABLE: 131,
    EOWNERDEAD: 130,
    ESTRPIPE: 86
};
function _sysconf(name) {
    switch (name) {
        case 30:
            return PAGE_SIZE;
        case 85:
            return totalMemory / PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
            return 200809;
        case 79:
            return 0;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
            return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
            return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
            return 1024;
        case 31:
        case 42:
        case 72:
            return 32;
        case 87:
        case 26:
        case 33:
            return 2147483647;
        case 34:
        case 1:
            return 47839;
        case 38:
        case 36:
            return 99;
        case 43:
        case 37:
            return 2048;
        case 0:
            return 2097152;
        case 3:
            return 65536;
        case 28:
            return 32768;
        case 44:
            return 32767;
        case 75:
            return 16384;
        case 39:
            return 1e3;
        case 89:
            return 700;
        case 71:
            return 256;
        case 40:
            return 255;
        case 2:
            return 100;
        case 180:
            return 64;
        case 25:
            return 20;
        case 5:
            return 16;
        case 6:
            return 6;
        case 73:
            return 4;
        case 84:
        {
            if (typeof navigator === "object")return navigator["hardwareConcurrency"] || 1;
            return 1
        }
    }
    ___setErrNo(ERRNO_CODES.EINVAL);
    return -1
}
Module["_memset"] = _memset;
function _pthread_cleanup_push(routine, arg) {
    __ATEXIT__.push((function () {
        Runtime.dynCall("vi", routine, [arg])
    }));
    _pthread_cleanup_push.level = __ATEXIT__.length
}
function _pthread_cleanup_pop() {
    assert(_pthread_cleanup_push.level == __ATEXIT__.length, "cannot pop if something else added meanwhile!");
    __ATEXIT__.pop();
    _pthread_cleanup_push.level = __ATEXIT__.length
}
function _abort() {
    Module["abort"]()
}
function ___lock() {
}
function ___unlock() {
}
var ERRNO_MESSAGES = {
    0: "Success",
    1: "Not super-user",
    2: "No such file or directory",
    3: "No such process",
    4: "Interrupted system call",
    5: "I/O error",
    6: "No such device or address",
    7: "Arg list too long",
    8: "Exec format error",
    9: "Bad file number",
    10: "No children",
    11: "No more processes",
    12: "Not enough core",
    13: "Permission denied",
    14: "Bad address",
    15: "Block device required",
    16: "Mount device busy",
    17: "File exists",
    18: "Cross-device link",
    19: "No such device",
    20: "Not a directory",
    21: "Is a directory",
    22: "Invalid argument",
    23: "Too many open files in system",
    24: "Too many open files",
    25: "Not a typewriter",
    26: "Text file busy",
    27: "File too large",
    28: "No space left on device",
    29: "Illegal seek",
    30: "Read only file system",
    31: "Too many links",
    32: "Broken pipe",
    33: "Math arg out of domain of func",
    34: "Math result not representable",
    35: "File locking deadlock error",
    36: "File or path name too long",
    37: "No record locks available",
    38: "Function not implemented",
    39: "Directory not empty",
    40: "Too many symbolic links",
    42: "No message of desired type",
    43: "Identifier removed",
    44: "Channel number out of range",
    45: "Level 2 not synchronized",
    46: "Level 3 halted",
    47: "Level 3 reset",
    48: "Link number out of range",
    49: "Protocol driver not attached",
    50: "No CSI structure available",
    51: "Level 2 halted",
    52: "Invalid exchange",
    53: "Invalid request descriptor",
    54: "Exchange full",
    55: "No anode",
    56: "Invalid request code",
    57: "Invalid slot",
    59: "Bad font file fmt",
    60: "Device not a stream",
    61: "No data (for no delay io)",
    62: "Timer expired",
    63: "Out of streams resources",
    64: "Machine is not on the network",
    65: "Package not installed",
    66: "The object is remote",
    67: "The link has been severed",
    68: "Advertise error",
    69: "Srmount error",
    70: "Communication error on send",
    71: "Protocol error",
    72: "Multihop attempted",
    73: "Cross mount point (not really error)",
    74: "Trying to read unreadable message",
    75: "Value too large for defined data type",
    76: "Given log. name not unique",
    77: "f.d. invalid for this operation",
    78: "Remote address changed",
    79: "Can   access a needed shared lib",
    80: "Accessing a corrupted shared lib",
    81: ".lib section in a.out corrupted",
    82: "Attempting to link in too many libs",
    83: "Attempting to exec a shared library",
    84: "Illegal byte sequence",
    86: "Streams pipe error",
    87: "Too many users",
    88: "Socket operation on non-socket",
    89: "Destination address required",
    90: "Message too long",
    91: "Protocol wrong type for socket",
    92: "Protocol not available",
    93: "Unknown protocol",
    94: "Socket type not supported",
    95: "Not supported",
    96: "Protocol family not supported",
    97: "Address family not supported by protocol family",
    98: "Address already in use",
    99: "Address not available",
    100: "Network interface is not configured",
    101: "Network is unreachable",
    102: "Connection reset by network",
    103: "Connection aborted",
    104: "Connection reset by peer",
    105: "No buffer space available",
    106: "Socket is already connected",
    107: "Socket is not connected",
    108: "Can't send after socket shutdown",
    109: "Too many references",
    110: "Connection timed out",
    111: "Connection refused",
    112: "Host is down",
    113: "Host is unreachable",
    114: "Socket already connected",
    115: "Connection already in progress",
    116: "Stale file handle",
    122: "Quota exceeded",
    123: "No medium (in tape drive)",
    125: "Operation canceled",
    130: "Previous owner died",
    131: "State not recoverable"
};
var PATH = {
    splitPath: (function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1)
    }), normalizeArray: (function (parts, allowAboveRoot) {
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
            var last = parts[i];
            if (last === ".") {
                parts.splice(i, 1)
            } else if (last === "..") {
                parts.splice(i, 1);
                up++
            } else if (up) {
                parts.splice(i, 1);
                up--
            }
        }
        if (allowAboveRoot) {
            for (; up--; up) {
                parts.unshift("..")
            }
        }
        return parts
    }), normalize: (function (path) {
        var isAbsolute = path.charAt(0) === "/", trailingSlash = path.substr(-1) === "/";
        path = PATH.normalizeArray(path.split("/").filter((function (p) {
            return !!p
        })), !isAbsolute).join("/");
        if (!path && !isAbsolute) {
            path = "."
        }
        if (path && trailingSlash) {
            path += "/"
        }
        return (isAbsolute ? "/" : "") + path
    }), dirname: (function (path) {
        var result = PATH.splitPath(path), root = result[0], dir = result[1];
        if (!root && !dir) {
            return "."
        }
        if (dir) {
            dir = dir.substr(0, dir.length - 1)
        }
        return root + dir
    }), basename: (function (path) {
        if (path === "/")return "/";
        var lastSlash = path.lastIndexOf("/");
        if (lastSlash === -1)return path;
        return path.substr(lastSlash + 1)
    }), extname: (function (path) {
        return PATH.splitPath(path)[3]
    }), join: (function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join("/"))
    }), join2: (function (l, r) {
        return PATH.normalize(l + "/" + r)
    }), resolve: (function () {
        var resolvedPath = "", resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
            var path = i >= 0 ? arguments[i] : FS.cwd();
            if (typeof path !== "string") {
                throw new TypeError("Arguments to path.resolve must be strings")
            } else if (!path) {
                return ""
            }
            resolvedPath = path + "/" + resolvedPath;
            resolvedAbsolute = path.charAt(0) === "/"
        }
        resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((function (p) {
            return !!p
        })), !resolvedAbsolute).join("/");
        return (resolvedAbsolute ? "/" : "") + resolvedPath || "."
    }), relative: (function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
            var start = 0;
            for (; start < arr.length; start++) {
                if (arr[start] !== "")break
            }
            var end = arr.length - 1;
            for (; end >= 0; end--) {
                if (arr[end] !== "")break
            }
            if (start > end)return [];
            return arr.slice(start, end - start + 1)
        }

        var fromParts = trim(from.split("/"));
        var toParts = trim(to.split("/"));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
            if (fromParts[i] !== toParts[i]) {
                samePartsLength = i;
                break
            }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
            outputParts.push("..")
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join("/")
    })
};
var TTY = {
    ttys: [], init: (function () {
    }), shutdown: (function () {
    }), register: (function (dev, ops) {
        TTY.ttys[dev] = {input: [], output: [], ops: ops};
        FS.registerDevice(dev, TTY.stream_ops)
    }), stream_ops: {
        open: (function (stream) {
            var tty = TTY.ttys[stream.node.rdev];
            if (!tty) {
                throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
            }
            stream.tty = tty;
            stream.seekable = false
        }), close: (function (stream) {
            stream.tty.ops.flush(stream.tty)
        }), flush: (function (stream) {
            stream.tty.ops.flush(stream.tty)
        }), read: (function (stream, buffer, offset, length, pos) {
            if (!stream.tty || !stream.tty.ops.get_char) {
                throw new FS.ErrnoError(ERRNO_CODES.ENXIO)
            }
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
                var result;
                try {
                    result = stream.tty.ops.get_char(stream.tty)
                } catch (e) {
                    throw new FS.ErrnoError(ERRNO_CODES.EIO)
                }
                if (result === undefined && bytesRead === 0) {
                    throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
                }
                if (result === null || result === undefined)break;
                bytesRead++;
                buffer[offset + i] = result
            }
            if (bytesRead) {
                stream.node.timestamp = Date.now()
            }
            return bytesRead
        }), write: (function (stream, buffer, offset, length, pos) {
            if (!stream.tty || !stream.tty.ops.put_char) {
                throw new FS.ErrnoError(ERRNO_CODES.ENXIO)
            }
            for (var i = 0; i < length; i++) {
                try {
                    stream.tty.ops.put_char(stream.tty, buffer[offset + i])
                } catch (e) {
                    throw new FS.ErrnoError(ERRNO_CODES.EIO)
                }
            }
            if (length) {
                stream.node.timestamp = Date.now()
            }
            return i
        })
    }, default_tty_ops: {
        get_char: (function (tty) {
            if (!tty.input.length) {
                var result = null;
                if (ENVIRONMENT_IS_NODE) {
                    var BUFSIZE = 256;
                    var buf = new Buffer(BUFSIZE);
                    var bytesRead = 0;
                    var fd = process.stdin.fd;
                    var usingDevice = false;
                    try {
                        fd = fs.openSync("/dev/stdin", "r");
                        usingDevice = true
                    } catch (e) {
                    }
                    bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
                    if (usingDevice) {
                        fs.closeSync(fd)
                    }
                    if (bytesRead > 0) {
                        result = buf.slice(0, bytesRead).toString("utf-8")
                    } else {
                        result = null
                    }
                } else if (typeof window != "undefined" && typeof window.prompt == "function") {
                    result = window.prompt("Input: ");
                    if (result !== null) {
                        result += "\n"
                    }
                } else if (typeof readline == "function") {
                    result = readline();
                    if (result !== null) {
                        result += "\n"
                    }
                }
                if (!result) {
                    return null
                }
                tty.input = intArrayFromString(result, true)
            }
            return tty.input.shift()
        }), put_char: (function (tty, val) {
            if (val === null || val === 10) {
                Module["print"](UTF8ArrayToString(tty.output, 0));
                tty.output = []
            } else {
                if (val != 0)tty.output.push(val)
            }
        }), flush: (function (tty) {
            if (tty.output && tty.output.length > 0) {
                Module["print"](UTF8ArrayToString(tty.output, 0));
                tty.output = []
            }
        })
    }, default_tty1_ops: {
        put_char: (function (tty, val) {
            if (val === null || val === 10) {
                Module["printErr"](UTF8ArrayToString(tty.output, 0));
                tty.output = []
            } else {
                if (val != 0)tty.output.push(val)
            }
        }), flush: (function (tty) {
            if (tty.output && tty.output.length > 0) {
                Module["printErr"](UTF8ArrayToString(tty.output, 0));
                tty.output = []
            }
        })
    }
};
var MEMFS = {
    ops_table: null, mount: (function (mount) {
        return MEMFS.createNode(null, "/", 16384 | 511, 0)
    }), createNode: (function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        if (!MEMFS.ops_table) {
            MEMFS.ops_table = {
                dir: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr,
                        lookup: MEMFS.node_ops.lookup,
                        mknod: MEMFS.node_ops.mknod,
                        rename: MEMFS.node_ops.rename,
                        unlink: MEMFS.node_ops.unlink,
                        rmdir: MEMFS.node_ops.rmdir,
                        readdir: MEMFS.node_ops.readdir,
                        symlink: MEMFS.node_ops.symlink
                    }, stream: {llseek: MEMFS.stream_ops.llseek}
                },
                file: {
                    node: {getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr},
                    stream: {
                        llseek: MEMFS.stream_ops.llseek,
                        read: MEMFS.stream_ops.read,
                        write: MEMFS.stream_ops.write,
                        allocate: MEMFS.stream_ops.allocate,
                        mmap: MEMFS.stream_ops.mmap,
                        msync: MEMFS.stream_ops.msync
                    }
                },
                link: {
                    node: {
                        getattr: MEMFS.node_ops.getattr,
                        setattr: MEMFS.node_ops.setattr,
                        readlink: MEMFS.node_ops.readlink
                    }, stream: {}
                },
                chrdev: {
                    node: {getattr: MEMFS.node_ops.getattr, setattr: MEMFS.node_ops.setattr},
                    stream: FS.chrdev_stream_ops
                }
            }
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
            node.node_ops = MEMFS.ops_table.dir.node;
            node.stream_ops = MEMFS.ops_table.dir.stream;
            node.contents = {}
        } else if (FS.isFile(node.mode)) {
            node.node_ops = MEMFS.ops_table.file.node;
            node.stream_ops = MEMFS.ops_table.file.stream;
            node.usedBytes = 0;
            node.contents = null
        } else if (FS.isLink(node.mode)) {
            node.node_ops = MEMFS.ops_table.link.node;
            node.stream_ops = MEMFS.ops_table.link.stream
        } else if (FS.isChrdev(node.mode)) {
            node.node_ops = MEMFS.ops_table.chrdev.node;
            node.stream_ops = MEMFS.ops_table.chrdev.stream
        }
        node.timestamp = Date.now();
        if (parent) {
            parent.contents[name] = node
        }
        return node
    }), getFileDataAsRegularArray: (function (node) {
        if (node.contents && node.contents.subarray) {
            var arr = [];
            for (var i = 0; i < node.usedBytes; ++i)arr.push(node.contents[i]);
            return arr
        }
        return node.contents
    }), getFileDataAsTypedArray: (function (node) {
        if (!node.contents)return new Uint8Array;
        if (node.contents.subarray)return node.contents.subarray(0, node.usedBytes);
        return new Uint8Array(node.contents)
    }), expandFileStorage: (function (node, newCapacity) {
        if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
            node.contents = MEMFS.getFileDataAsRegularArray(node);
            node.usedBytes = node.contents.length
        }
        if (!node.contents || node.contents.subarray) {
            var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
            if (prevCapacity >= newCapacity)return;
            var CAPACITY_DOUBLING_MAX = 1024 * 1024;
            newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) | 0);
            if (prevCapacity != 0)newCapacity = Math.max(newCapacity, 256);
            var oldContents = node.contents;
            node.contents = new Uint8Array(newCapacity);
            if (node.usedBytes > 0)node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
            return
        }
        if (!node.contents && newCapacity > 0)node.contents = [];
        while (node.contents.length < newCapacity)node.contents.push(0)
    }), resizeFileStorage: (function (node, newSize) {
        if (node.usedBytes == newSize)return;
        if (newSize == 0) {
            node.contents = null;
            node.usedBytes = 0;
            return
        }
        if (!node.contents || node.contents.subarray) {
            var oldContents = node.contents;
            node.contents = new Uint8Array(new ArrayBuffer(newSize));
            if (oldContents) {
                node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)))
            }
            node.usedBytes = newSize;
            return
        }
        if (!node.contents)node.contents = [];
        if (node.contents.length > newSize)node.contents.length = newSize; else while (node.contents.length < newSize)node.contents.push(0);
        node.usedBytes = newSize
    }), node_ops: {
        getattr: (function (node) {
            var attr = {};
            attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
            attr.ino = node.id;
            attr.mode = node.mode;
            attr.nlink = 1;
            attr.uid = 0;
            attr.gid = 0;
            attr.rdev = node.rdev;
            if (FS.isDir(node.mode)) {
                attr.size = 4096
            } else if (FS.isFile(node.mode)) {
                attr.size = node.usedBytes
            } else if (FS.isLink(node.mode)) {
                attr.size = node.link.length
            } else {
                attr.size = 0
            }
            attr.atime = new Date(node.timestamp);
            attr.mtime = new Date(node.timestamp);
            attr.ctime = new Date(node.timestamp);
            attr.blksize = 4096;
            attr.blocks = Math.ceil(attr.size / attr.blksize);
            return attr
        }), setattr: (function (node, attr) {
            if (attr.mode !== undefined) {
                node.mode = attr.mode
            }
            if (attr.timestamp !== undefined) {
                node.timestamp = attr.timestamp
            }
            if (attr.size !== undefined) {
                MEMFS.resizeFileStorage(node, attr.size)
            }
        }), lookup: (function (parent, name) {
            throw FS.genericErrors[ERRNO_CODES.ENOENT]
        }), mknod: (function (parent, name, mode, dev) {
            return MEMFS.createNode(parent, name, mode, dev)
        }), rename: (function (old_node, new_dir, new_name) {
            if (FS.isDir(old_node.mode)) {
                var new_node;
                try {
                    new_node = FS.lookupNode(new_dir, new_name)
                } catch (e) {
                }
                if (new_node) {
                    for (var i in new_node.contents) {
                        throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
                    }
                }
            }
            delete old_node.parent.contents[old_node.name];
            old_node.name = new_name;
            new_dir.contents[new_name] = old_node;
            old_node.parent = new_dir
        }), unlink: (function (parent, name) {
            delete parent.contents[name]
        }), rmdir: (function (parent, name) {
            var node = FS.lookupNode(parent, name);
            for (var i in node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
            }
            delete parent.contents[name]
        }), readdir: (function (node) {
            var entries = [".", ".."];
            for (var key in node.contents) {
                if (!node.contents.hasOwnProperty(key)) {
                    continue
                }
                entries.push(key)
            }
            return entries
        }), symlink: (function (parent, newname, oldpath) {
            var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
            node.link = oldpath;
            return node
        }), readlink: (function (node) {
            if (!FS.isLink(node.mode)) {
                throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
            }
            return node.link
        })
    }, stream_ops: {
        read: (function (stream, buffer, offset, length, position) {
            var contents = stream.node.contents;
            if (position >= stream.node.usedBytes)return 0;
            var size = Math.min(stream.node.usedBytes - position, length);
            assert(size >= 0);
            if (size > 8 && contents.subarray) {
                buffer.set(contents.subarray(position, position + size), offset)
            } else {
                for (var i = 0; i < size; i++)buffer[offset + i] = contents[position + i]
            }
            return size
        }), write: (function (stream, buffer, offset, length, position, canOwn) {
            if (!length)return 0;
            var node = stream.node;
            node.timestamp = Date.now();
            if (buffer.subarray && (!node.contents || node.contents.subarray)) {
                if (canOwn) {
                    node.contents = buffer.subarray(offset, offset + length);
                    node.usedBytes = length;
                    return length
                } else if (node.usedBytes === 0 && position === 0) {
                    node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
                    node.usedBytes = length;
                    return length
                } else if (position + length <= node.usedBytes) {
                    node.contents.set(buffer.subarray(offset, offset + length), position);
                    return length
                }
            }
            MEMFS.expandFileStorage(node, position + length);
            if (node.contents.subarray && buffer.subarray)node.contents.set(buffer.subarray(offset, offset + length), position); else {
                for (var i = 0; i < length; i++) {
                    node.contents[position + i] = buffer[offset + i]
                }
            }
            node.usedBytes = Math.max(node.usedBytes, position + length);
            return length
        }), llseek: (function (stream, offset, whence) {
            var position = offset;
            if (whence === 1) {
                position += stream.position
            } else if (whence === 2) {
                if (FS.isFile(stream.node.mode)) {
                    position += stream.node.usedBytes
                }
            }
            if (position < 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
            }
            return position
        }), allocate: (function (stream, offset, length) {
            MEMFS.expandFileStorage(stream.node, offset + length);
            stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length)
        }), mmap: (function (stream, buffer, offset, length, position, prot, flags) {
            if (!FS.isFile(stream.node.mode)) {
                throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
            }
            var ptr;
            var allocated;
            var contents = stream.node.contents;
            if (!(flags & 2) && (contents.buffer === buffer || contents.buffer === buffer.buffer)) {
                allocated = false;
                ptr = contents.byteOffset
            } else {
                if (position > 0 || position + length < stream.node.usedBytes) {
                    if (contents.subarray) {
                        contents = contents.subarray(position, position + length)
                    } else {
                        contents = Array.prototype.slice.call(contents, position, position + length)
                    }
                }
                allocated = true;
                ptr = _malloc(length);
                if (!ptr) {
                    throw new FS.ErrnoError(ERRNO_CODES.ENOMEM)
                }
                buffer.set(contents, ptr)
            }
            return {ptr: ptr, allocated: allocated}
        }), msync: (function (stream, buffer, offset, length, mmapFlags) {
            if (!FS.isFile(stream.node.mode)) {
                throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
            }
            if (mmapFlags & 2) {
                return 0
            }
            var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
            return 0
        })
    }
};
var IDBFS = {
    dbs: {}, indexedDB: (function () {
        if (typeof indexedDB !== "undefined")return indexedDB;
        var ret = null;
        if (typeof window === "object")ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        assert(ret, "IDBFS used, but indexedDB not supported");
        return ret
    }), DB_VERSION: 21, DB_STORE_NAME: "FILE_DATA", mount: (function (mount) {
        return MEMFS.mount.apply(null, arguments)
    }), syncfs: (function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, (function (err, local) {
            if (err)return callback(err);
            IDBFS.getRemoteSet(mount, (function (err, remote) {
                if (err)return callback(err);
                var src = populate ? remote : local;
                var dst = populate ? local : remote;
                IDBFS.reconcile(src, dst, callback)
            }))
        }))
    }), getDB: (function (name, callback) {
        var db = IDBFS.dbs[name];
        if (db) {
            return callback(null, db)
        }
        var req;
        try {
            req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION)
        } catch (e) {
            return callback(e)
        }
        req.onupgradeneeded = (function (e) {
            var db = e.target.result;
            var transaction = e.target.transaction;
            var fileStore;
            if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
                fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME)
            } else {
                fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME)
            }
            if (!fileStore.indexNames.contains("timestamp")) {
                fileStore.createIndex("timestamp", "timestamp", {unique: false})
            }
        });
        req.onsuccess = (function () {
            db = req.result;
            IDBFS.dbs[name] = db;
            callback(null, db)
        });
        req.onerror = (function (e) {
            callback(this.error);
            e.preventDefault()
        })
    }), getLocalSet: (function (mount, callback) {
        var entries = {};

        function isRealDir(p) {
            return p !== "." && p !== ".."
        }

        function toAbsolute(root) {
            return (function (p) {
                return PATH.join2(root, p)
            })
        }

        var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
        while (check.length) {
            var path = check.pop();
            var stat;
            try {
                stat = FS.stat(path)
            } catch (e) {
                return callback(e)
            }
            if (FS.isDir(stat.mode)) {
                check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)))
            }
            entries[path] = {timestamp: stat.mtime}
        }
        return callback(null, {type: "local", entries: entries})
    }), getRemoteSet: (function (mount, callback) {
        var entries = {};
        IDBFS.getDB(mount.mountpoint, (function (err, db) {
            if (err)return callback(err);
            var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readonly");
            transaction.onerror = (function (e) {
                callback(this.error);
                e.preventDefault()
            });
            var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
            var index = store.index("timestamp");
            index.openKeyCursor().onsuccess = (function (event) {
                var cursor = event.target.result;
                if (!cursor) {
                    return callback(null, {type: "remote", db: db, entries: entries})
                }
                entries[cursor.primaryKey] = {timestamp: cursor.key};
                cursor.continue()
            })
        }))
    }), loadLocalEntry: (function (path, callback) {
        var stat, node;
        try {
            var lookup = FS.lookupPath(path);
            node = lookup.node;
            stat = FS.stat(path)
        } catch (e) {
            return callback(e)
        }
        if (FS.isDir(stat.mode)) {
            return callback(null, {timestamp: stat.mtime, mode: stat.mode})
        } else if (FS.isFile(stat.mode)) {
            node.contents = MEMFS.getFileDataAsTypedArray(node);
            return callback(null, {timestamp: stat.mtime, mode: stat.mode, contents: node.contents})
        } else {
            return callback(new Error("node type not supported"))
        }
    }), storeLocalEntry: (function (path, entry, callback) {
        try {
            if (FS.isDir(entry.mode)) {
                FS.mkdir(path, entry.mode)
            } else if (FS.isFile(entry.mode)) {
                FS.writeFile(path, entry.contents, {encoding: "binary", canOwn: true})
            } else {
                return callback(new Error("node type not supported"))
            }
            FS.chmod(path, entry.mode);
            FS.utime(path, entry.timestamp, entry.timestamp)
        } catch (e) {
            return callback(e)
        }
        callback(null)
    }), removeLocalEntry: (function (path, callback) {
        try {
            var lookup = FS.lookupPath(path);
            var stat = FS.stat(path);
            if (FS.isDir(stat.mode)) {
                FS.rmdir(path)
            } else if (FS.isFile(stat.mode)) {
                FS.unlink(path)
            }
        } catch (e) {
            return callback(e)
        }
        callback(null)
    }), loadRemoteEntry: (function (store, path, callback) {
        var req = store.get(path);
        req.onsuccess = (function (event) {
            callback(null, event.target.result)
        });
        req.onerror = (function (e) {
            callback(this.error);
            e.preventDefault()
        })
    }), storeRemoteEntry: (function (store, path, entry, callback) {
        var req = store.put(entry, path);
        req.onsuccess = (function () {
            callback(null)
        });
        req.onerror = (function (e) {
            callback(this.error);
            e.preventDefault()
        })
    }), removeRemoteEntry: (function (store, path, callback) {
        var req = store.delete(path);
        req.onsuccess = (function () {
            callback(null)
        });
        req.onerror = (function (e) {
            callback(this.error);
            e.preventDefault()
        })
    }), reconcile: (function (src, dst, callback) {
        var total = 0;
        var create = [];
        Object.keys(src.entries).forEach((function (key) {
            var e = src.entries[key];
            var e2 = dst.entries[key];
            if (!e2 || e.timestamp > e2.timestamp) {
                create.push(key);
                total++
            }
        }));
        var remove = [];
        Object.keys(dst.entries).forEach((function (key) {
            var e = dst.entries[key];
            var e2 = src.entries[key];
            if (!e2) {
                remove.push(key);
                total++
            }
        }));
        if (!total) {
            return callback(null)
        }
        var errored = false;
        var completed = 0;
        var db = src.type === "remote" ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readwrite");
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);

        function done(err) {
            if (err) {
                if (!done.errored) {
                    done.errored = true;
                    return callback(err)
                }
                return
            }
            if (++completed >= total) {
                return callback(null)
            }
        }

        transaction.onerror = (function (e) {
            done(this.error);
            e.preventDefault()
        });
        create.sort().forEach((function (path) {
            if (dst.type === "local") {
                IDBFS.loadRemoteEntry(store, path, (function (err, entry) {
                    if (err)return done(err);
                    IDBFS.storeLocalEntry(path, entry, done)
                }))
            } else {
                IDBFS.loadLocalEntry(path, (function (err, entry) {
                    if (err)return done(err);
                    IDBFS.storeRemoteEntry(store, path, entry, done)
                }))
            }
        }));
        remove.sort().reverse().forEach((function (path) {
            if (dst.type === "local") {
                IDBFS.removeLocalEntry(path, done)
            } else {
                IDBFS.removeRemoteEntry(store, path, done)
            }
        }))
    })
};
var NODEFS = {
    isWindows: false,
    staticInit: (function () {
        NODEFS.isWindows = !!process.platform.match(/^win/)
    }),
    mount: (function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, "/", NODEFS.getMode(mount.opts.root), 0)
    }),
    createNode: (function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node
    }),
    getMode: (function (path) {
        var stat;
        try {
            stat = fs.lstatSync(path);
            if (NODEFS.isWindows) {
                stat.mode = stat.mode | (stat.mode & 146) >> 1
            }
        } catch (e) {
            if (!e.code)throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code])
        }
        return stat.mode
    }),
    realPath: (function (node) {
        var parts = [];
        while (node.parent !== node) {
            parts.push(node.name);
            node = node.parent
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts)
    }),
    flagsToPermissionStringMap: {
        0: "r",
        1: "r+",
        2: "r+",
        64: "r",
        65: "r+",
        66: "r+",
        129: "rx+",
        193: "rx+",
        514: "w+",
        577: "w",
        578: "w+",
        705: "wx",
        706: "wx+",
        1024: "a",
        1025: "a",
        1026: "a+",
        1089: "a",
        1090: "a+",
        1153: "ax",
        1154: "ax+",
        1217: "ax",
        1218: "ax+",
        4096: "rs",
        4098: "rs+"
    },
    flagsToPermissionString: (function (flags) {
        flags &= ~32768;
        if (flags in NODEFS.flagsToPermissionStringMap) {
            return NODEFS.flagsToPermissionStringMap[flags]
        } else {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
    }),
    node_ops: {
        getattr: (function (node) {
            var path = NODEFS.realPath(node);
            var stat;
            try {
                stat = fs.lstatSync(path)
            } catch (e) {
                if (!e.code)throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
            if (NODEFS.isWindows && !stat.blksize) {
                stat.blksize = 4096
            }
            if (NODEFS.isWindows && !stat.blocks) {
                stat.blocks = (stat.size + stat.blksize - 1) / stat.blksize | 0
            }
            return {
                dev: stat.dev,
                ino: stat.ino,
                mode: stat.mode,
                nlink: stat.nlink,
                uid: stat.uid,
                gid: stat.gid,
                rdev: stat.rdev,
                size: stat.size,
                atime: stat.atime,
                mtime: stat.mtime,
                ctime: stat.ctime,
                blksize: stat.blksize,
                blocks: stat.blocks
            }
        }), setattr: (function (node, attr) {
            var path = NODEFS.realPath(node);
            try {
                if (attr.mode !== undefined) {
                    fs.chmodSync(path, attr.mode);
                    node.mode = attr.mode
                }
                if (attr.timestamp !== undefined) {
                    var date = new Date(attr.timestamp);
                    fs.utimesSync(path, date, date)
                }
                if (attr.size !== undefined) {
                    fs.truncateSync(path, attr.size)
                }
            } catch (e) {
                if (!e.code)throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }), lookup: (function (parent, name) {
            var path = PATH.join2(NODEFS.realPath(parent), name);
            var mode = NODEFS.getMode(path);
            return NODEFS.createNode(parent, name, mode)
        }), mknod: (function (parent, name, mode, dev) {
            var node = NODEFS.createNode(parent, name, mode, dev);
            var path = NODEFS.realPath(node);
            try {
                if (FS.isDir(node.mode)) {
                    fs.mkdirSync(path, node.mode)
                } else {
                    fs.writeFileSync(path, "", {mode: node.mode})
                }
            } catch (e) {
                if (!e.code)throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
            return node
        }), rename: (function (oldNode, newDir, newName) {
            var oldPath = NODEFS.realPath(oldNode);
            var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
            try {
                fs.renameSync(oldPath, newPath)
            } catch (e) {
                if (!e.code)throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }), unlink: (function (parent, name) {
            var path = PATH.join2(NODEFS.realPath(parent), name);
            try {
                fs.unlinkSync(path)
            } catch (e) {
                if (!e.code)throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }), rmdir: (function (parent, name) {
            var path = PATH.join2(NODEFS.realPath(parent), name);
            try {
                fs.rmdirSync(path)
            } catch (e) {
                if (!e.code)throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }), readdir: (function (node) {
            var path = NODEFS.realPath(node);
            try {
                return fs.readdirSync(path)
            } catch (e) {
                if (!e.code)throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }), symlink: (function (parent, newName, oldPath) {
            var newPath = PATH.join2(NODEFS.realPath(parent), newName);
            try {
                fs.symlinkSync(oldPath, newPath)
            } catch (e) {
                if (!e.code)throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }), readlink: (function (node) {
            var path = NODEFS.realPath(node);
            try {
                path = fs.readlinkSync(path);
                path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
                return path
            } catch (e) {
                if (!e.code)throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        })
    },
    stream_ops: {
        open: (function (stream) {
            var path = NODEFS.realPath(stream.node);
            try {
                if (FS.isFile(stream.node.mode)) {
                    stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags))
                }
            } catch (e) {
                if (!e.code)throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }), close: (function (stream) {
            try {
                if (FS.isFile(stream.node.mode) && stream.nfd) {
                    fs.closeSync(stream.nfd)
                }
            } catch (e) {
                if (!e.code)throw e;
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
        }), read: (function (stream, buffer, offset, length, position) {
            if (length === 0)return 0;
            var nbuffer = new Buffer(length);
            var res;
            try {
                res = fs.readSync(stream.nfd, nbuffer, 0, length, position)
            } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
            if (res > 0) {
                for (var i = 0; i < res; i++) {
                    buffer[offset + i] = nbuffer[i]
                }
            }
            return res
        }), write: (function (stream, buffer, offset, length, position) {
            var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
            var res;
            try {
                res = fs.writeSync(stream.nfd, nbuffer, 0, length, position)
            } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code])
            }
            return res
        }), llseek: (function (stream, offset, whence) {
            var position = offset;
            if (whence === 1) {
                position += stream.position
            } else if (whence === 2) {
                if (FS.isFile(stream.node.mode)) {
                    try {
                        var stat = fs.fstatSync(stream.nfd);
                        position += stat.size
                    } catch (e) {
                        throw new FS.ErrnoError(ERRNO_CODES[e.code])
                    }
                }
            }
            if (position < 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
            }
            return position
        })
    }
};
var WORKERFS = {
    DIR_MODE: 16895, FILE_MODE: 33279, reader: null, mount: (function (mount) {
        assert(ENVIRONMENT_IS_WORKER);
        if (!WORKERFS.reader)WORKERFS.reader = new FileReaderSync;
        var root = WORKERFS.createNode(null, "/", WORKERFS.DIR_MODE, 0);
        var createdParents = {};

        function ensureParent(path) {
            var parts = path.split("/");
            var parent = root;
            for (var i = 0; i < parts.length - 1; i++) {
                var curr = parts.slice(0, i + 1).join("/");
                if (!createdParents[curr]) {
                    createdParents[curr] = WORKERFS.createNode(parent, curr, WORKERFS.DIR_MODE, 0)
                }
                parent = createdParents[curr]
            }
            return parent
        }

        function base(path) {
            var parts = path.split("/");
            return parts[parts.length - 1]
        }

        Array.prototype.forEach.call(mount.opts["files"] || [], (function (file) {
            WORKERFS.createNode(ensureParent(file.name), base(file.name), WORKERFS.FILE_MODE, 0, file, file.lastModifiedDate)
        }));
        (mount.opts["blobs"] || []).forEach((function (obj) {
            WORKERFS.createNode(ensureParent(obj["name"]), base(obj["name"]), WORKERFS.FILE_MODE, 0, obj["data"])
        }));
        (mount.opts["packages"] || []).forEach((function (pack) {
            pack["metadata"].files.forEach((function (file) {
                var name = file.filename.substr(1);
                WORKERFS.createNode(ensureParent(name), base(name), WORKERFS.FILE_MODE, 0, pack["blob"].slice(file.start, file.end))
            }))
        }));
        return root
    }), createNode: (function (parent, name, mode, dev, contents, mtime) {
        var node = FS.createNode(parent, name, mode);
        node.mode = mode;
        node.node_ops = WORKERFS.node_ops;
        node.stream_ops = WORKERFS.stream_ops;
        node.timestamp = (mtime || new Date).getTime();
        assert(WORKERFS.FILE_MODE !== WORKERFS.DIR_MODE);
        if (mode === WORKERFS.FILE_MODE) {
            node.size = contents.size;
            node.contents = contents
        } else {
            node.size = 4096;
            node.contents = {}
        }
        if (parent) {
            parent.contents[name] = node
        }
        return node
    }), node_ops: {
        getattr: (function (node) {
            return {
                dev: 1,
                ino: undefined,
                mode: node.mode,
                nlink: 1,
                uid: 0,
                gid: 0,
                rdev: undefined,
                size: node.size,
                atime: new Date(node.timestamp),
                mtime: new Date(node.timestamp),
                ctime: new Date(node.timestamp),
                blksize: 4096,
                blocks: Math.ceil(node.size / 4096)
            }
        }), setattr: (function (node, attr) {
            if (attr.mode !== undefined) {
                node.mode = attr.mode
            }
            if (attr.timestamp !== undefined) {
                node.timestamp = attr.timestamp
            }
        }), lookup: (function (parent, name) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }), mknod: (function (parent, name, mode, dev) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }), rename: (function (oldNode, newDir, newName) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }), unlink: (function (parent, name) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }), rmdir: (function (parent, name) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }), readdir: (function (node) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }), symlink: (function (parent, newName, oldPath) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }), readlink: (function (node) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        })
    }, stream_ops: {
        read: (function (stream, buffer, offset, length, position) {
            if (position >= stream.node.size)return 0;
            var chunk = stream.node.contents.slice(position, position + length);
            var ab = WORKERFS.reader.readAsArrayBuffer(chunk);
            buffer.set(new Uint8Array(ab), offset);
            return chunk.size
        }), write: (function (stream, buffer, offset, length, position) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO)
        }), llseek: (function (stream, offset, whence) {
            var position = offset;
            if (whence === 1) {
                position += stream.position
            } else if (whence === 2) {
                if (FS.isFile(stream.node.mode)) {
                    position += stream.node.size
                }
            }
            if (position < 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
            }
            return position
        })
    }
};
var _stdin = allocate(1, "i32*", ALLOC_STATIC);
var _stdout = allocate(1, "i32*", ALLOC_STATIC);
var _stderr = allocate(1, "i32*", ALLOC_STATIC);
var FS = {
    root: null,
    mounts: [],
    devices: [null],
    streams: [],
    nextInode: 1,
    nameTable: null,
    currentPath: "/",
    initialized: false,
    ignorePermissions: true,
    trackingDelegate: {},
    tracking: {openFlags: {READ: 1, WRITE: 2}},
    ErrnoError: null,
    genericErrors: {},
    filesystems: null,
    handleFSError: (function (e) {
        if (!(e instanceof FS.ErrnoError))throw e + " : " + stackTrace();
        return ___setErrNo(e.errno)
    }),
    lookupPath: (function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || {};
        if (!path)return {path: "", node: null};
        var defaults = {follow_mount: true, recurse_count: 0};
        for (var key in defaults) {
            if (opts[key] === undefined) {
                opts[key] = defaults[key]
            }
        }
        if (opts.recurse_count > 8) {
            throw new FS.ErrnoError(ERRNO_CODES.ELOOP)
        }
        var parts = PATH.normalizeArray(path.split("/").filter((function (p) {
            return !!p
        })), false);
        var current = FS.root;
        var current_path = "/";
        for (var i = 0; i < parts.length; i++) {
            var islast = i === parts.length - 1;
            if (islast && opts.parent) {
                break
            }
            current = FS.lookupNode(current, parts[i]);
            current_path = PATH.join2(current_path, parts[i]);
            if (FS.isMountpoint(current)) {
                if (!islast || islast && opts.follow_mount) {
                    current = current.mounted.root
                }
            }
            if (!islast || opts.follow) {
                var count = 0;
                while (FS.isLink(current.mode)) {
                    var link = FS.readlink(current_path);
                    current_path = PATH.resolve(PATH.dirname(current_path), link);
                    var lookup = FS.lookupPath(current_path, {recurse_count: opts.recurse_count});
                    current = lookup.node;
                    if (count++ > 40) {
                        throw new FS.ErrnoError(ERRNO_CODES.ELOOP)
                    }
                }
            }
        }
        return {path: current_path, node: current}
    }),
    getPath: (function (node) {
        var path;
        while (true) {
            if (FS.isRoot(node)) {
                var mount = node.mount.mountpoint;
                if (!path)return mount;
                return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path
            }
            path = path ? node.name + "/" + path : node.name;
            node = node.parent
        }
    }),
    hashName: (function (parentid, name) {
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
            hash = (hash << 5) - hash + name.charCodeAt(i) | 0
        }
        return (parentid + hash >>> 0) % FS.nameTable.length
    }),
    hashAddNode: (function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node
    }),
    hashRemoveNode: (function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
            FS.nameTable[hash] = node.name_next
        } else {
            var current = FS.nameTable[hash];
            while (current) {
                if (current.name_next === node) {
                    current.name_next = node.name_next;
                    break
                }
                current = current.name_next
            }
        }
    }),
    lookupNode: (function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
            throw new FS.ErrnoError(err, parent)
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
            var nodeName = node.name;
            if (node.parent.id === parent.id && nodeName === name) {
                return node
            }
        }
        return FS.lookup(parent, name)
    }),
    createNode: (function (parent, name, mode, rdev) {
        if (!FS.FSNode) {
            FS.FSNode = (function (parent, name, mode, rdev) {
                if (!parent) {
                    parent = this
                }
                this.parent = parent;
                this.mount = parent.mount;
                this.mounted = null;
                this.id = FS.nextInode++;
                this.name = name;
                this.mode = mode;
                this.node_ops = {};
                this.stream_ops = {};
                this.rdev = rdev
            });
            FS.FSNode.prototype = {};
            var readMode = 292 | 73;
            var writeMode = 146;
            Object.defineProperties(FS.FSNode.prototype, {
                read: {
                    get: (function () {
                        return (this.mode & readMode) === readMode
                    }), set: (function (val) {
                        val ? this.mode |= readMode : this.mode &= ~readMode
                    })
                }, write: {
                    get: (function () {
                        return (this.mode & writeMode) === writeMode
                    }), set: (function (val) {
                        val ? this.mode |= writeMode : this.mode &= ~writeMode
                    })
                }, isFolder: {
                    get: (function () {
                        return FS.isDir(this.mode)
                    })
                }, isDevice: {
                    get: (function () {
                        return FS.isChrdev(this.mode)
                    })
                }
            })
        }
        var node = new FS.FSNode(parent, name, mode, rdev);
        FS.hashAddNode(node);
        return node
    }),
    destroyNode: (function (node) {
        FS.hashRemoveNode(node)
    }),
    isRoot: (function (node) {
        return node === node.parent
    }),
    isMountpoint: (function (node) {
        return !!node.mounted
    }),
    isFile: (function (mode) {
        return (mode & 61440) === 32768
    }),
    isDir: (function (mode) {
        return (mode & 61440) === 16384
    }),
    isLink: (function (mode) {
        return (mode & 61440) === 40960
    }),
    isChrdev: (function (mode) {
        return (mode & 61440) === 8192
    }),
    isBlkdev: (function (mode) {
        return (mode & 61440) === 24576
    }),
    isFIFO: (function (mode) {
        return (mode & 61440) === 4096
    }),
    isSocket: (function (mode) {
        return (mode & 49152) === 49152
    }),
    flagModes: {
        "r": 0,
        "rs": 1052672,
        "r+": 2,
        "w": 577,
        "wx": 705,
        "xw": 705,
        "w+": 578,
        "wx+": 706,
        "xw+": 706,
        "a": 1089,
        "ax": 1217,
        "xa": 1217,
        "a+": 1090,
        "ax+": 1218,
        "xa+": 1218
    },
    modeStringToFlags: (function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === "undefined") {
            throw new Error("Unknown file open mode: " + str)
        }
        return flags
    }),
    flagsToPermissionString: (function (flag) {
        var perms = ["r", "w", "rw"][flag & 3];
        if (flag & 512) {
            perms += "w"
        }
        return perms
    }),
    nodePermissions: (function (node, perms) {
        if (FS.ignorePermissions) {
            return 0
        }
        if (perms.indexOf("r") !== -1 && !(node.mode & 292)) {
            return ERRNO_CODES.EACCES
        } else if (perms.indexOf("w") !== -1 && !(node.mode & 146)) {
            return ERRNO_CODES.EACCES
        } else if (perms.indexOf("x") !== -1 && !(node.mode & 73)) {
            return ERRNO_CODES.EACCES
        }
        return 0
    }),
    mayLookup: (function (dir) {
        var err = FS.nodePermissions(dir, "x");
        if (err)return err;
        if (!dir.node_ops.lookup)return ERRNO_CODES.EACCES;
        return 0
    }),
    mayCreate: (function (dir, name) {
        try {
            var node = FS.lookupNode(dir, name);
            return ERRNO_CODES.EEXIST
        } catch (e) {
        }
        return FS.nodePermissions(dir, "wx")
    }),
    mayDelete: (function (dir, name, isdir) {
        var node;
        try {
            node = FS.lookupNode(dir, name)
        } catch (e) {
            return e.errno
        }
        var err = FS.nodePermissions(dir, "wx");
        if (err) {
            return err
        }
        if (isdir) {
            if (!FS.isDir(node.mode)) {
                return ERRNO_CODES.ENOTDIR
            }
            if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
                return ERRNO_CODES.EBUSY
            }
        } else {
            if (FS.isDir(node.mode)) {
                return ERRNO_CODES.EISDIR
            }
        }
        return 0
    }),
    mayOpen: (function (node, flags) {
        if (!node) {
            return ERRNO_CODES.ENOENT
        }
        if (FS.isLink(node.mode)) {
            return ERRNO_CODES.ELOOP
        } else if (FS.isDir(node.mode)) {
            if ((flags & 2097155) !== 0 || flags & 512) {
                return ERRNO_CODES.EISDIR
            }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags))
    }),
    MAX_OPEN_FDS: 4096,
    nextfd: (function (fd_start, fd_end) {
        fd_start = fd_start || 0;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
            if (!FS.streams[fd]) {
                return fd
            }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE)
    }),
    getStream: (function (fd) {
        return FS.streams[fd]
    }),
    createStream: (function (stream, fd_start, fd_end) {
        if (!FS.FSStream) {
            FS.FSStream = (function () {
            });
            FS.FSStream.prototype = {};
            Object.defineProperties(FS.FSStream.prototype, {
                object: {
                    get: (function () {
                        return this.node
                    }), set: (function (val) {
                        this.node = val
                    })
                }, isRead: {
                    get: (function () {
                        return (this.flags & 2097155) !== 1
                    })
                }, isWrite: {
                    get: (function () {
                        return (this.flags & 2097155) !== 0
                    })
                }, isAppend: {
                    get: (function () {
                        return this.flags & 1024
                    })
                }
            })
        }
        var newStream = new FS.FSStream;
        for (var p in stream) {
            newStream[p] = stream[p]
        }
        stream = newStream;
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream
    }),
    closeStream: (function (fd) {
        FS.streams[fd] = null
    }),
    chrdev_stream_ops: {
        open: (function (stream) {
            var device = FS.getDevice(stream.node.rdev);
            stream.stream_ops = device.stream_ops;
            if (stream.stream_ops.open) {
                stream.stream_ops.open(stream)
            }
        }), llseek: (function () {
            throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
        })
    },
    major: (function (dev) {
        return dev >> 8
    }),
    minor: (function (dev) {
        return dev & 255
    }),
    makedev: (function (ma, mi) {
        return ma << 8 | mi
    }),
    registerDevice: (function (dev, ops) {
        FS.devices[dev] = {stream_ops: ops}
    }),
    getDevice: (function (dev) {
        return FS.devices[dev]
    }),
    getMounts: (function (mount) {
        var mounts = [];
        var check = [mount];
        while (check.length) {
            var m = check.pop();
            mounts.push(m);
            check.push.apply(check, m.mounts)
        }
        return mounts
    }),
    syncfs: (function (populate, callback) {
        if (typeof populate === "function") {
            callback = populate;
            populate = false
        }
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;

        function done(err) {
            if (err) {
                if (!done.errored) {
                    done.errored = true;
                    return callback(err)
                }
                return
            }
            if (++completed >= mounts.length) {
                callback(null)
            }
        }

        mounts.forEach((function (mount) {
            if (!mount.type.syncfs) {
                return done(null)
            }
            mount.type.syncfs(mount, populate, done)
        }))
    }),
    mount: (function (type, opts, mountpoint) {
        var root = mountpoint === "/";
        var pseudo = !mountpoint;
        var node;
        if (root && FS.root) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
        } else if (!root && !pseudo) {
            var lookup = FS.lookupPath(mountpoint, {follow_mount: false});
            mountpoint = lookup.path;
            node = lookup.node;
            if (FS.isMountpoint(node)) {
                throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
            }
            if (!FS.isDir(node.mode)) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
            }
        }
        var mount = {type: type, opts: opts, mountpoint: mountpoint, mounts: []};
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
        if (root) {
            FS.root = mountRoot
        } else if (node) {
            node.mounted = mount;
            if (node.mount) {
                node.mount.mounts.push(mount)
            }
        }
        return mountRoot
    }),
    unmount: (function (mountpoint) {
        var lookup = FS.lookupPath(mountpoint, {follow_mount: false});
        if (!FS.isMountpoint(lookup.node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
        Object.keys(FS.nameTable).forEach((function (hash) {
            var current = FS.nameTable[hash];
            while (current) {
                var next = current.name_next;
                if (mounts.indexOf(current.mount) !== -1) {
                    FS.destroyNode(current)
                }
                current = next
            }
        }));
        node.mounted = null;
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1)
    }),
    lookup: (function (parent, name) {
        return parent.node_ops.lookup(parent, name)
    }),
    mknod: (function (path, mode, dev) {
        var lookup = FS.lookupPath(path, {parent: true});
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name || name === "." || name === "..") {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var err = FS.mayCreate(parent, name);
        if (err) {
            throw new FS.ErrnoError(err)
        }
        if (!parent.node_ops.mknod) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        return parent.node_ops.mknod(parent, name, mode, dev)
    }),
    create: (function (path, mode) {
        mode = mode !== undefined ? mode : 438;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0)
    }),
    mkdir: (function (path, mode) {
        mode = mode !== undefined ? mode : 511;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0)
    }),
    mkdev: (function (path, mode, dev) {
        if (typeof dev === "undefined") {
            dev = mode;
            mode = 438
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev)
    }),
    symlink: (function (oldpath, newpath) {
        if (!PATH.resolve(oldpath)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        var lookup = FS.lookupPath(newpath, {parent: true});
        var parent = lookup.node;
        if (!parent) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
            throw new FS.ErrnoError(err)
        }
        if (!parent.node_ops.symlink) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        return parent.node_ops.symlink(parent, newname, oldpath)
    }),
    rename: (function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        var lookup, old_dir, new_dir;
        try {
            lookup = FS.lookupPath(old_path, {parent: true});
            old_dir = lookup.node;
            lookup = FS.lookupPath(new_path, {parent: true});
            new_dir = lookup.node
        } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
        }
        if (!old_dir || !new_dir)throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        if (old_dir.mount !== new_dir.mount) {
            throw new FS.ErrnoError(ERRNO_CODES.EXDEV)
        }
        var old_node = FS.lookupNode(old_dir, old_name);
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== ".") {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== ".") {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
        }
        var new_node;
        try {
            new_node = FS.lookupNode(new_dir, new_name)
        } catch (e) {
        }
        if (old_node === new_node) {
            return
        }
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
            throw new FS.ErrnoError(err)
        }
        err = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
        if (err) {
            throw new FS.ErrnoError(err)
        }
        if (!old_dir.node_ops.rename) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
        }
        if (new_dir !== old_dir) {
            err = FS.nodePermissions(old_dir, "w");
            if (err) {
                throw new FS.ErrnoError(err)
            }
        }
        try {
            if (FS.trackingDelegate["willMovePath"]) {
                FS.trackingDelegate["willMovePath"](old_path, new_path)
            }
        } catch (e) {
            console.log("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
        }
        FS.hashRemoveNode(old_node);
        try {
            old_dir.node_ops.rename(old_node, new_dir, new_name)
        } catch (e) {
            throw e
        } finally {
            FS.hashAddNode(old_node)
        }
        try {
            if (FS.trackingDelegate["onMovePath"])FS.trackingDelegate["onMovePath"](old_path, new_path)
        } catch (e) {
            console.log("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
        }
    }),
    rmdir: (function (path) {
        var lookup = FS.lookupPath(path, {parent: true});
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
            throw new FS.ErrnoError(err)
        }
        if (!parent.node_ops.rmdir) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
        }
        try {
            if (FS.trackingDelegate["willDeletePath"]) {
                FS.trackingDelegate["willDeletePath"](path)
            }
        } catch (e) {
            console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
        try {
            if (FS.trackingDelegate["onDeletePath"])FS.trackingDelegate["onDeletePath"](path)
        } catch (e) {
            console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
        }
    }),
    readdir: (function (path) {
        var lookup = FS.lookupPath(path, {follow: true});
        var node = lookup.node;
        if (!node.node_ops.readdir) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
        }
        return node.node_ops.readdir(node)
    }),
    unlink: (function (path) {
        var lookup = FS.lookupPath(path, {parent: true});
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
            if (err === ERRNO_CODES.EISDIR)err = ERRNO_CODES.EPERM;
            throw new FS.ErrnoError(err)
        }
        if (!parent.node_ops.unlink) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
        }
        try {
            if (FS.trackingDelegate["willDeletePath"]) {
                FS.trackingDelegate["willDeletePath"](path)
            }
        } catch (e) {
            console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
        try {
            if (FS.trackingDelegate["onDeletePath"])FS.trackingDelegate["onDeletePath"](path)
        } catch (e) {
            console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
        }
    }),
    readlink: (function (path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        if (!link.node_ops.readlink) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        return PATH.resolve(FS.getPath(link.parent), link.node_ops.readlink(link))
    }),
    stat: (function (path, dontFollow) {
        var lookup = FS.lookupPath(path, {follow: !dontFollow});
        var node = lookup.node;
        if (!node) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        if (!node.node_ops.getattr) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        return node.node_ops.getattr(node)
    }),
    lstat: (function (path) {
        return FS.stat(path, true)
    }),
    chmod: (function (path, mode, dontFollow) {
        var node;
        if (typeof path === "string") {
            var lookup = FS.lookupPath(path, {follow: !dontFollow});
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        node.node_ops.setattr(node, {mode: mode & 4095 | node.mode & ~4095, timestamp: Date.now()})
    }),
    lchmod: (function (path, mode) {
        FS.chmod(path, mode, true)
    }),
    fchmod: (function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(ERRNO_CODES.EBADF)
        }
        FS.chmod(stream.node, mode)
    }),
    chown: (function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === "string") {
            var lookup = FS.lookupPath(path, {follow: !dontFollow});
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        node.node_ops.setattr(node, {timestamp: Date.now()})
    }),
    lchown: (function (path, uid, gid) {
        FS.chown(path, uid, gid, true)
    }),
    fchown: (function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(ERRNO_CODES.EBADF)
        }
        FS.chown(stream.node, uid, gid)
    }),
    truncate: (function (path, len) {
        if (len < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var node;
        if (typeof path === "string") {
            var lookup = FS.lookupPath(path, {follow: true});
            node = lookup.node
        } else {
            node = path
        }
        if (!node.node_ops.setattr) {
            throw new FS.ErrnoError(ERRNO_CODES.EPERM)
        }
        if (FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
        }
        if (!FS.isFile(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var err = FS.nodePermissions(node, "w");
        if (err) {
            throw new FS.ErrnoError(err)
        }
        node.node_ops.setattr(node, {size: len, timestamp: Date.now()})
    }),
    ftruncate: (function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
            throw new FS.ErrnoError(ERRNO_CODES.EBADF)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        FS.truncate(stream.node, len)
    }),
    utime: (function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, {follow: true});
        var node = lookup.node;
        node.node_ops.setattr(node, {timestamp: Math.max(atime, mtime)})
    }),
    open: (function (path, flags, mode, fd_start, fd_end) {
        if (path === "") {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === "undefined" ? 438 : mode;
        if (flags & 64) {
            mode = mode & 4095 | 32768
        } else {
            mode = 0
        }
        var node;
        if (typeof path === "object") {
            node = path
        } else {
            path = PATH.normalize(path);
            try {
                var lookup = FS.lookupPath(path, {follow: !(flags & 131072)});
                node = lookup.node
            } catch (e) {
            }
        }
        var created = false;
        if (flags & 64) {
            if (node) {
                if (flags & 128) {
                    throw new FS.ErrnoError(ERRNO_CODES.EEXIST)
                }
            } else {
                node = FS.mknod(path, mode, 0);
                created = true
            }
        }
        if (!node) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
        }
        if (FS.isChrdev(node.mode)) {
            flags &= ~512
        }
        if (flags & 65536 && !FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
        }
        if (!created) {
            var err = FS.mayOpen(node, flags);
            if (err) {
                throw new FS.ErrnoError(err)
            }
        }
        if (flags & 512) {
            FS.truncate(node, 0)
        }
        flags &= ~(128 | 512);
        var stream = FS.createStream({
            node: node,
            path: FS.getPath(node),
            flags: flags,
            seekable: true,
            position: 0,
            stream_ops: node.stream_ops,
            ungotten: [],
            error: false
        }, fd_start, fd_end);
        if (stream.stream_ops.open) {
            stream.stream_ops.open(stream)
        }
        if (Module["logReadFiles"] && !(flags & 1)) {
            if (!FS.readFiles)FS.readFiles = {};
            if (!(path in FS.readFiles)) {
                FS.readFiles[path] = 1;
                Module["printErr"]("read file: " + path)
            }
        }
        try {
            if (FS.trackingDelegate["onOpenFile"]) {
                var trackingFlags = 0;
                if ((flags & 2097155) !== 1) {
                    trackingFlags |= FS.tracking.openFlags.READ
                }
                if ((flags & 2097155) !== 0) {
                    trackingFlags |= FS.tracking.openFlags.WRITE
                }
                FS.trackingDelegate["onOpenFile"](path, trackingFlags)
            }
        } catch (e) {
            console.log("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message)
        }
        return stream
    }),
    close: (function (stream) {
        if (stream.getdents)stream.getdents = null;
        try {
            if (stream.stream_ops.close) {
                stream.stream_ops.close(stream)
            }
        } catch (e) {
            throw e
        } finally {
            FS.closeStream(stream.fd)
        }
    }),
    llseek: (function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
            throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position
    }),
    read: (function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        if ((stream.flags & 2097155) === 1) {
            throw new FS.ErrnoError(ERRNO_CODES.EBADF)
        }
        if (FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
        }
        if (!stream.stream_ops.read) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        var seeking = true;
        if (typeof position === "undefined") {
            position = stream.position;
            seeking = false
        } else if (!stream.seekable) {
            throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking)stream.position += bytesRead;
        return bytesRead
    }),
    write: (function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EBADF)
        }
        if (FS.isDir(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
        }
        if (!stream.stream_ops.write) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        if (stream.flags & 1024) {
            FS.llseek(stream, 0, 2)
        }
        var seeking = true;
        if (typeof position === "undefined") {
            position = stream.position;
            seeking = false
        } else if (!stream.seekable) {
            throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking)stream.position += bytesWritten;
        try {
            if (stream.path && FS.trackingDelegate["onWriteToFile"])FS.trackingDelegate["onWriteToFile"](stream.path)
        } catch (e) {
            console.log("FS.trackingDelegate['onWriteToFile']('" + path + "') threw an exception: " + e.message)
        }
        return bytesWritten
    }),
    allocate: (function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
        }
        if ((stream.flags & 2097155) === 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EBADF)
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
        }
        if (!stream.stream_ops.allocate) {
            throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP)
        }
        stream.stream_ops.allocate(stream, offset, length)
    }),
    mmap: (function (stream, buffer, offset, length, position, prot, flags) {
        if ((stream.flags & 2097155) === 1) {
            throw new FS.ErrnoError(ERRNO_CODES.EACCES)
        }
        if (!stream.stream_ops.mmap) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags)
    }),
    msync: (function (stream, buffer, offset, length, mmapFlags) {
        if (!stream || !stream.stream_ops.msync) {
            return 0
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags)
    }),
    munmap: (function (stream) {
        return 0
    }),
    ioctl: (function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTTY)
        }
        return stream.stream_ops.ioctl(stream, cmd, arg)
    }),
    readFile: (function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || "r";
        opts.encoding = opts.encoding || "binary";
        if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
            throw new Error('Invalid encoding type "' + opts.encoding + '"')
        }
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === "utf8") {
            ret = UTF8ArrayToString(buf, 0)
        } else if (opts.encoding === "binary") {
            ret = buf
        }
        FS.close(stream);
        return ret
    }),
    writeFile: (function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || "w";
        opts.encoding = opts.encoding || "utf8";
        if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
            throw new Error('Invalid encoding type "' + opts.encoding + '"')
        }
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === "utf8") {
            var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
            var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
            FS.write(stream, buf, 0, actualNumBytes, 0, opts.canOwn)
        } else if (opts.encoding === "binary") {
            FS.write(stream, data, 0, data.length, 0, opts.canOwn)
        }
        FS.close(stream)
    }),
    cwd: (function () {
        return FS.currentPath
    }),
    chdir: (function (path) {
        var lookup = FS.lookupPath(path, {follow: true});
        if (!FS.isDir(lookup.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
        }
        var err = FS.nodePermissions(lookup.node, "x");
        if (err) {
            throw new FS.ErrnoError(err)
        }
        FS.currentPath = lookup.path
    }),
    createDefaultDirectories: (function () {
        FS.mkdir("/tmp");
        FS.mkdir("/home");
        FS.mkdir("/home/web_user")
    }),
    createDefaultDevices: (function () {
        FS.mkdir("/dev");
        FS.registerDevice(FS.makedev(1, 3), {
            read: (function () {
                return 0
            }), write: (function (stream, buffer, offset, length, pos) {
                return length
            })
        });
        FS.mkdev("/dev/null", FS.makedev(1, 3));
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev("/dev/tty", FS.makedev(5, 0));
        FS.mkdev("/dev/tty1", FS.makedev(6, 0));
        var random_device;
        if (typeof crypto !== "undefined") {
            var randomBuffer = new Uint8Array(1);
            random_device = (function () {
                crypto.getRandomValues(randomBuffer);
                return randomBuffer[0]
            })
        } else if (ENVIRONMENT_IS_NODE) {
            random_device = (function () {
                return require("crypto").randomBytes(1)[0]
            })
        } else {
            random_device = (function () {
                return Math.random() * 256 | 0
            })
        }
        FS.createDevice("/dev", "random", random_device);
        FS.createDevice("/dev", "urandom", random_device);
        FS.mkdir("/dev/shm");
        FS.mkdir("/dev/shm/tmp")
    }),
    createSpecialDirectories: (function () {
        FS.mkdir("/proc");
        FS.mkdir("/proc/self");
        FS.mkdir("/proc/self/fd");
        FS.mount({
            mount: (function () {
                var node = FS.createNode("/proc/self", "fd", 16384 | 511, 73);
                node.node_ops = {
                    lookup: (function (parent, name) {
                        var fd = +name;
                        var stream = FS.getStream(fd);
                        if (!stream)throw new FS.ErrnoError(ERRNO_CODES.EBADF);
                        var ret = {
                            parent: null, mount: {mountpoint: "fake"}, node_ops: {
                                readlink: (function () {
                                    return stream.path
                                })
                            }
                        };
                        ret.parent = ret;
                        return ret
                    })
                };
                return node
            })
        }, {}, "/proc/self/fd")
    }),
    createStandardStreams: (function () {
        if (Module["stdin"]) {
            FS.createDevice("/dev", "stdin", Module["stdin"])
        } else {
            FS.symlink("/dev/tty", "/dev/stdin")
        }
        if (Module["stdout"]) {
            FS.createDevice("/dev", "stdout", null, Module["stdout"])
        } else {
            FS.symlink("/dev/tty", "/dev/stdout")
        }
        if (Module["stderr"]) {
            FS.createDevice("/dev", "stderr", null, Module["stderr"])
        } else {
            FS.symlink("/dev/tty1", "/dev/stderr")
        }
        var stdin = FS.open("/dev/stdin", "r");
        assert(stdin.fd === 0, "invalid handle for stdin (" + stdin.fd + ")");
        var stdout = FS.open("/dev/stdout", "w");
        assert(stdout.fd === 1, "invalid handle for stdout (" + stdout.fd + ")");
        var stderr = FS.open("/dev/stderr", "w");
        assert(stderr.fd === 2, "invalid handle for stderr (" + stderr.fd + ")")
    }),
    ensureErrnoError: (function () {
        if (FS.ErrnoError)return;
        FS.ErrnoError = function ErrnoError(errno, node) {
            this.node = node;
            this.setErrno = (function (errno) {
                this.errno = errno;
                for (var key in ERRNO_CODES) {
                    if (ERRNO_CODES[key] === errno) {
                        this.code = key;
                        break
                    }
                }
            });
            this.setErrno(errno);
            this.message = ERRNO_MESSAGES[errno]
        };
        FS.ErrnoError.prototype = new Error;
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
        [ERRNO_CODES.ENOENT].forEach((function (code) {
            FS.genericErrors[code] = new FS.ErrnoError(code);
            FS.genericErrors[code].stack = "<generic error, no stack>"
        }))
    }),
    staticInit: (function () {
        FS.ensureErrnoError();
        FS.nameTable = new Array(4096);
        FS.mount(MEMFS, {}, "/");
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
        FS.filesystems = {"MEMFS": MEMFS, "IDBFS": IDBFS, "NODEFS": NODEFS, "WORKERFS": WORKERFS}
    }),
    init: (function (input, output, error) {
        assert(!FS.init.initialized, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");
        FS.init.initialized = true;
        FS.ensureErrnoError();
        Module["stdin"] = input || Module["stdin"];
        Module["stdout"] = output || Module["stdout"];
        Module["stderr"] = error || Module["stderr"];
        FS.createStandardStreams()
    }),
    quit: (function () {
        FS.init.initialized = false;
        var fflush = Module["_fflush"];
        if (fflush)fflush(0);
        for (var i = 0; i < FS.streams.length; i++) {
            var stream = FS.streams[i];
            if (!stream) {
                continue
            }
            FS.close(stream)
        }
    }),
    getMode: (function (canRead, canWrite) {
        var mode = 0;
        if (canRead)mode |= 292 | 73;
        if (canWrite)mode |= 146;
        return mode
    }),
    joinPath: (function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == "/")path = path.substr(1);
        return path
    }),
    absolutePath: (function (relative, base) {
        return PATH.resolve(base, relative)
    }),
    standardizePath: (function (path) {
        return PATH.normalize(path)
    }),
    findObject: (function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
            return ret.object
        } else {
            ___setErrNo(ret.error);
            return null
        }
    }),
    analyzePath: (function (path, dontResolveLastLink) {
        try {
            var lookup = FS.lookupPath(path, {follow: !dontResolveLastLink});
            path = lookup.path
        } catch (e) {
        }
        var ret = {
            isRoot: false,
            exists: false,
            error: 0,
            name: null,
            path: null,
            object: null,
            parentExists: false,
            parentPath: null,
            parentObject: null
        };
        try {
            var lookup = FS.lookupPath(path, {parent: true});
            ret.parentExists = true;
            ret.parentPath = lookup.path;
            ret.parentObject = lookup.node;
            ret.name = PATH.basename(path);
            lookup = FS.lookupPath(path, {follow: !dontResolveLastLink});
            ret.exists = true;
            ret.path = lookup.path;
            ret.object = lookup.node;
            ret.name = lookup.node.name;
            ret.isRoot = lookup.path === "/"
        } catch (e) {
            ret.error = e.errno
        }
        return ret
    }),
    createFolder: (function (parent, name, canRead, canWrite) {
        var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode)
    }),
    createPath: (function (parent, path, canRead, canWrite) {
        parent = typeof parent === "string" ? parent : FS.getPath(parent);
        var parts = path.split("/").reverse();
        while (parts.length) {
            var part = parts.pop();
            if (!part)continue;
            var current = PATH.join2(parent, part);
            try {
                FS.mkdir(current)
            } catch (e) {
            }
            parent = current
        }
        return current
    }),
    createFile: (function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode)
    }),
    createDataFile: (function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
            if (typeof data === "string") {
                var arr = new Array(data.length);
                for (var i = 0, len = data.length; i < len; ++i)arr[i] = data.charCodeAt(i);
                data = arr
            }
            FS.chmod(node, mode | 146);
            var stream = FS.open(node, "w");
            FS.write(stream, data, 0, data.length, 0, canOwn);
            FS.close(stream);
            FS.chmod(node, mode)
        }
        return node
    }),
    createDevice: (function (parent, name, input, output) {
        var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major)FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        FS.registerDevice(dev, {
            open: (function (stream) {
                stream.seekable = false
            }), close: (function (stream) {
                if (output && output.buffer && output.buffer.length) {
                    output(10)
                }
            }), read: (function (stream, buffer, offset, length, pos) {
                var bytesRead = 0;
                for (var i = 0; i < length; i++) {
                    var result;
                    try {
                        result = input()
                    } catch (e) {
                        throw new FS.ErrnoError(ERRNO_CODES.EIO)
                    }
                    if (result === undefined && bytesRead === 0) {
                        throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
                    }
                    if (result === null || result === undefined)break;
                    bytesRead++;
                    buffer[offset + i] = result
                }
                if (bytesRead) {
                    stream.node.timestamp = Date.now()
                }
                return bytesRead
            }), write: (function (stream, buffer, offset, length, pos) {
                for (var i = 0; i < length; i++) {
                    try {
                        output(buffer[offset + i])
                    } catch (e) {
                        throw new FS.ErrnoError(ERRNO_CODES.EIO)
                    }
                }
                if (length) {
                    stream.node.timestamp = Date.now()
                }
                return i
            })
        });
        return FS.mkdev(path, mode, dev)
    }),
    createLink: (function (parent, name, target, canRead, canWrite) {
        var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path)
    }),
    forceLoadFile: (function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents)return true;
        var success = true;
        if (typeof XMLHttpRequest !== "undefined") {
            throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")
        } else if (Module["read"]) {
            try {
                obj.contents = intArrayFromString(Module["read"](obj.url), true);
                obj.usedBytes = obj.contents.length
            } catch (e) {
                success = false
            }
        } else {
            throw new Error("Cannot load without read() or XMLHttpRequest.")
        }
        if (!success)___setErrNo(ERRNO_CODES.EIO);
        return success
    }),
    createLazyFile: (function (parent, name, url, canRead, canWrite) {
        function LazyUint8Array() {
            this.lengthKnown = false;
            this.chunks = []
        }

        LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
            if (idx > this.length - 1 || idx < 0) {
                return undefined
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = idx / this.chunkSize | 0;
            return this.getter(chunkNum)[chunkOffset]
        };
        LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
            this.getter = getter
        };
        LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
            var xhr = new XMLHttpRequest;
            xhr.open("HEAD", url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304))throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
            var datalength = Number(xhr.getResponseHeader("Content-length"));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
            var chunkSize = 1024 * 1024;
            if (!hasByteServing)chunkSize = datalength;
            var doXHR = (function (from, to) {
                if (from > to)throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
                if (to > datalength - 1)throw new Error("only " + datalength + " bytes available! programmer error!");
                var xhr = new XMLHttpRequest;
                xhr.open("GET", url, false);
                if (datalength !== chunkSize)xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
                if (typeof Uint8Array != "undefined")xhr.responseType = "arraybuffer";
                if (xhr.overrideMimeType) {
                    xhr.overrideMimeType("text/plain; charset=x-user-defined")
                }
                xhr.send(null);
                if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304))throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                if (xhr.response !== undefined) {
                    return new Uint8Array(xhr.response || [])
                } else {
                    return intArrayFromString(xhr.responseText || "", true)
                }
            });
            var lazyArray = this;
            lazyArray.setDataGetter((function (chunkNum) {
                var start = chunkNum * chunkSize;
                var end = (chunkNum + 1) * chunkSize - 1;
                end = Math.min(end, datalength - 1);
                if (typeof lazyArray.chunks[chunkNum] === "undefined") {
                    lazyArray.chunks[chunkNum] = doXHR(start, end)
                }
                if (typeof lazyArray.chunks[chunkNum] === "undefined")throw new Error("doXHR failed!");
                return lazyArray.chunks[chunkNum]
            }));
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true
        };
        if (typeof XMLHttpRequest !== "undefined") {
            if (!ENVIRONMENT_IS_WORKER)throw"Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
            var lazyArray = new LazyUint8Array;
            Object.defineProperty(lazyArray, "length", {
                get: (function () {
                    if (!this.lengthKnown) {
                        this.cacheLength()
                    }
                    return this._length
                })
            });
            Object.defineProperty(lazyArray, "chunkSize", {
                get: (function () {
                    if (!this.lengthKnown) {
                        this.cacheLength()
                    }
                    return this._chunkSize
                })
            });
            var properties = {isDevice: false, contents: lazyArray}
        } else {
            var properties = {isDevice: false, url: url}
        }
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        if (properties.contents) {
            node.contents = properties.contents
        } else if (properties.url) {
            node.contents = null;
            node.url = properties.url
        }
        Object.defineProperty(node, "usedBytes", {
            get: (function () {
                return this.contents.length
            })
        });
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach((function (key) {
            var fn = node.stream_ops[key];
            stream_ops[key] = function forceLoadLazyFile() {
                if (!FS.forceLoadFile(node)) {
                    throw new FS.ErrnoError(ERRNO_CODES.EIO)
                }
                return fn.apply(null, arguments)
            }
        }));
        stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
            if (!FS.forceLoadFile(node)) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO)
            }
            var contents = stream.node.contents;
            if (position >= contents.length)return 0;
            var size = Math.min(contents.length - position, length);
            assert(size >= 0);
            if (contents.slice) {
                for (var i = 0; i < size; i++) {
                    buffer[offset + i] = contents[position + i]
                }
            } else {
                for (var i = 0; i < size; i++) {
                    buffer[offset + i] = contents.get(position + i)
                }
            }
            return size
        };
        node.stream_ops = stream_ops;
        return node
    }),
    createPreloadedFile: (function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
        Browser.init();
        var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;
        var dep = getUniqueRunDependency("cp " + fullname);

        function processData(byteArray) {
            function finish(byteArray) {
                if (preFinish)preFinish();
                if (!dontCreateFile) {
                    FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn)
                }
                if (onload)onload();
                removeRunDependency(dep)
            }

            var handled = false;
            Module["preloadPlugins"].forEach((function (plugin) {
                if (handled)return;
                if (plugin["canHandle"](fullname)) {
                    plugin["handle"](byteArray, fullname, finish, (function () {
                        if (onerror)onerror();
                        removeRunDependency(dep)
                    }));
                    handled = true
                }
            }));
            if (!handled)finish(byteArray)
        }

        addRunDependency(dep);
        if (typeof url == "string") {
            Browser.asyncLoad(url, (function (byteArray) {
                processData(byteArray)
            }), onerror)
        } else {
            processData(url)
        }
    }),
    indexedDB: (function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
    }),
    DB_NAME: (function () {
        return "EM_FS_" + window.location.pathname
    }),
    DB_VERSION: 20,
    DB_STORE_NAME: "FILE_DATA",
    saveFilesToDB: (function (paths, onload, onerror) {
        onload = onload || (function () {
            });
        onerror = onerror || (function () {
            });
        var indexedDB = FS.indexedDB();
        try {
            var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
        } catch (e) {
            return onerror(e)
        }
        openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
            console.log("creating db");
            var db = openRequest.result;
            db.createObjectStore(FS.DB_STORE_NAME)
        };
        openRequest.onsuccess = function openRequest_onsuccess() {
            var db = openRequest.result;
            var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite");
            var files = transaction.objectStore(FS.DB_STORE_NAME);
            var ok = 0, fail = 0, total = paths.length;

            function finish() {
                if (fail == 0)onload(); else onerror()
            }

            paths.forEach((function (path) {
                var putRequest = files.put(FS.analyzePath(path).object.contents, path);
                putRequest.onsuccess = function putRequest_onsuccess() {
                    ok++;
                    if (ok + fail == total)finish()
                };
                putRequest.onerror = function putRequest_onerror() {
                    fail++;
                    if (ok + fail == total)finish()
                }
            }));
            transaction.onerror = onerror
        };
        openRequest.onerror = onerror
    }),
    loadFilesFromDB: (function (paths, onload, onerror) {
        onload = onload || (function () {
            });
        onerror = onerror || (function () {
            });
        var indexedDB = FS.indexedDB();
        try {
            var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
        } catch (e) {
            return onerror(e)
        }
        openRequest.onupgradeneeded = onerror;
        openRequest.onsuccess = function openRequest_onsuccess() {
            var db = openRequest.result;
            try {
                var transaction = db.transaction([FS.DB_STORE_NAME], "readonly")
            } catch (e) {
                onerror(e);
                return
            }
            var files = transaction.objectStore(FS.DB_STORE_NAME);
            var ok = 0, fail = 0, total = paths.length;

            function finish() {
                if (fail == 0)onload(); else onerror()
            }

            paths.forEach((function (path) {
                var getRequest = files.get(path);
                getRequest.onsuccess = function getRequest_onsuccess() {
                    if (FS.analyzePath(path).exists) {
                        FS.unlink(path)
                    }
                    FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
                    ok++;
                    if (ok + fail == total)finish()
                };
                getRequest.onerror = function getRequest_onerror() {
                    fail++;
                    if (ok + fail == total)finish()
                }
            }));
            transaction.onerror = onerror
        };
        openRequest.onerror = onerror
    })
};
var SYSCALLS = {
    DEFAULT_POLLMASK: 5, mappings: {}, umask: 511, calculateAt: (function (dirfd, path) {
        if (path[0] !== "/") {
            var dir;
            if (dirfd === -100) {
                dir = FS.cwd()
            } else {
                var dirstream = FS.getStream(dirfd);
                if (!dirstream)throw new FS.ErrnoError(ERRNO_CODES.EBADF);
                dir = dirstream.path
            }
            path = PATH.join2(dir, path)
        }
        return path
    }), doStat: (function (func, path, buf) {
        try {
            var stat = func(path)
        } catch (e) {
            if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
                return -ERRNO_CODES.ENOTDIR
            }
            throw e
        }
        HEAP32[buf >> 2] = stat.dev;
        HEAP32[buf + 4 >> 2] = 0;
        HEAP32[buf + 8 >> 2] = stat.ino;
        HEAP32[buf + 12 >> 2] = stat.mode;
        HEAP32[buf + 16 >> 2] = stat.nlink;
        HEAP32[buf + 20 >> 2] = stat.uid;
        HEAP32[buf + 24 >> 2] = stat.gid;
        HEAP32[buf + 28 >> 2] = stat.rdev;
        HEAP32[buf + 32 >> 2] = 0;
        HEAP32[buf + 36 >> 2] = stat.size;
        HEAP32[buf + 40 >> 2] = 4096;
        HEAP32[buf + 44 >> 2] = stat.blocks;
        HEAP32[buf + 48 >> 2] = stat.atime.getTime() / 1e3 | 0;
        HEAP32[buf + 52 >> 2] = 0;
        HEAP32[buf + 56 >> 2] = stat.mtime.getTime() / 1e3 | 0;
        HEAP32[buf + 60 >> 2] = 0;
        HEAP32[buf + 64 >> 2] = stat.ctime.getTime() / 1e3 | 0;
        HEAP32[buf + 68 >> 2] = 0;
        HEAP32[buf + 72 >> 2] = stat.ino;
        return 0
    }), doMsync: (function (addr, stream, len, flags) {
        var buffer = new Uint8Array(HEAPU8.subarray(addr, addr + len));
        FS.msync(stream, buffer, 0, len, flags)
    }), doMkdir: (function (path, mode) {
        path = PATH.normalize(path);
        if (path[path.length - 1] === "/")path = path.substr(0, path.length - 1);
        FS.mkdir(path, mode, 0);
        return 0
    }), doMknod: (function (path, mode, dev) {
        switch (mode & 61440) {
            case 32768:
            case 8192:
            case 24576:
            case 4096:
            case 49152:
                break;
            default:
                return -ERRNO_CODES.EINVAL
        }
        FS.mknod(path, mode, dev);
        return 0
    }), doReadlink: (function (path, buf, bufsize) {
        if (bufsize <= 0)return -ERRNO_CODES.EINVAL;
        var ret = FS.readlink(path);
        ret = ret.slice(0, Math.max(0, bufsize));
        writeStringToMemory(ret, buf, true);
        return ret.length
    }), doAccess: (function (path, amode) {
        if (amode & ~7) {
            return -ERRNO_CODES.EINVAL
        }
        var node;
        var lookup = FS.lookupPath(path, {follow: true});
        node = lookup.node;
        var perms = "";
        if (amode & 4)perms += "r";
        if (amode & 2)perms += "w";
        if (amode & 1)perms += "x";
        if (perms && FS.nodePermissions(node, perms)) {
            return -ERRNO_CODES.EACCES
        }
        return 0
    }), doDup: (function (path, flags, suggestFD) {
        var suggest = FS.getStream(suggestFD);
        if (suggest)FS.close(suggest);
        return FS.open(path, flags, 0, suggestFD, suggestFD).fd
    }), doReadv: (function (stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
            var ptr = HEAP32[iov + i * 8 >> 2];
            var len = HEAP32[iov + (i * 8 + 4) >> 2];
            var curr = FS.read(stream, HEAP8, ptr, len, offset);
            if (curr < 0)return -1;
            ret += curr;
            if (curr < len)break
        }
        return ret
    }), doWritev: (function (stream, iov, iovcnt, offset) {
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
            var ptr = HEAP32[iov + i * 8 >> 2];
            var len = HEAP32[iov + (i * 8 + 4) >> 2];
            var curr = FS.write(stream, HEAP8, ptr, len, offset);
            if (curr < 0)return -1;
            ret += curr
        }
        return ret
    }), varargs: 0, get: (function (varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
        return ret
    }), getStr: (function () {
        var ret = Pointer_stringify(SYSCALLS.get());
        return ret
    }), getStreamFromFD: (function () {
        var stream = FS.getStream(SYSCALLS.get());
        if (!stream)throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        return stream
    }), getSocketFromFD: (function () {
        var socket = SOCKFS.getSocket(SYSCALLS.get());
        if (!socket)throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        return socket
    }), getSocketAddress: (function (allowNull) {
        var addrp = SYSCALLS.get(), addrlen = SYSCALLS.get();
        if (allowNull && addrp === 0)return null;
        var info = __read_sockaddr(addrp, addrlen);
        if (info.errno)throw new FS.ErrnoError(info.errno);
        info.addr = DNS.lookup_addr(info.addr) || info.addr;
        return info
    }), get64: (function () {
        var low = SYSCALLS.get(), high = SYSCALLS.get();
        if (low >= 0)assert(high === 0); else assert(high === -1);
        return low
    }), getZero: (function () {
        assert(SYSCALLS.get() === 0)
    })
};
function ___syscall6(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var stream = SYSCALLS.getStreamFromFD();
        FS.close(stream);
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))abort(e);
        return -e.errno
    }
}
function _sbrk(bytes) {
    var self = _sbrk;
    if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP);
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = (function () {
            abort("cannot dynamically allocate, sbrk now has control")
        })
    }
    var ret = DYNAMICTOP;
    if (bytes != 0) {
        var success = self.alloc(bytes);
        if (!success)return -1 >>> 0
    }
    return ret
}
function _emscripten_memcpy_big(dest, src, num) {
    HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
    return dest
}
Module["_memcpy"] = _memcpy;
function _emscripten_set_main_loop_timing(mode, value) {
    Browser.mainLoop.timingMode = mode;
    Browser.mainLoop.timingValue = value;
    if (!Browser.mainLoop.func) {
        return 1
    }
    if (mode == 0) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setTimeout() {
            setTimeout(Browser.mainLoop.runner, value)
        };
        Browser.mainLoop.method = "timeout"
    } else if (mode == 1) {
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
            Browser.requestAnimationFrame(Browser.mainLoop.runner)
        };
        Browser.mainLoop.method = "rAF"
    } else if (mode == 2) {
        if (!window["setImmediate"]) {
            var setImmediates = [];
            var emscriptenMainLoopMessageId = "__emcc";

            function Browser_setImmediate_messageHandler(event) {
                if (event.source === window && event.data === emscriptenMainLoopMessageId) {
                    event.stopPropagation();
                    setImmediates.shift()()
                }
            }

            window.addEventListener("message", Browser_setImmediate_messageHandler, true);
            window["setImmediate"] = function Browser_emulated_setImmediate(func) {
                setImmediates.push(func);
                window.postMessage(emscriptenMainLoopMessageId, "*")
            }
        }
        Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setImmediate() {
            window["setImmediate"](Browser.mainLoop.runner)
        };
        Browser.mainLoop.method = "immediate"
    }
    return 0
}
function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg, noSetTiming) {
    Module["noExitRuntime"] = true;
    assert(!Browser.mainLoop.func, "emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.");
    Browser.mainLoop.func = func;
    Browser.mainLoop.arg = arg;
    var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
    Browser.mainLoop.runner = function Browser_mainLoop_runner() {
        if (ABORT)return;
        if (Browser.mainLoop.queue.length > 0) {
            var start = Date.now();
            var blocker = Browser.mainLoop.queue.shift();
            blocker.func(blocker.arg);
            if (Browser.mainLoop.remainingBlockers) {
                var remaining = Browser.mainLoop.remainingBlockers;
                var next = remaining % 1 == 0 ? remaining - 1 : Math.floor(remaining);
                if (blocker.counted) {
                    Browser.mainLoop.remainingBlockers = next
                } else {
                    next = next + .5;
                    Browser.mainLoop.remainingBlockers = (8 * remaining + next) / 9
                }
            }
            console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + " ms");
            Browser.mainLoop.updateStatus();
            setTimeout(Browser.mainLoop.runner, 0);
            return
        }
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop)return;
        Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
        if (Browser.mainLoop.timingMode == 1 && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
            Browser.mainLoop.scheduler();
            return
        }
        if (Browser.mainLoop.method === "timeout" && Module.ctx) {
            Module.printErr("Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!");
            Browser.mainLoop.method = ""
        }
        Browser.mainLoop.runIter((function () {
            if (typeof arg !== "undefined") {
                Runtime.dynCall("vi", func, [arg])
            } else {
                Runtime.dynCall("v", func)
            }
        }));
        if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop)return;
        if (typeof SDL === "object" && SDL.audio && SDL.audio.queueNewAudioData)SDL.audio.queueNewAudioData();
        Browser.mainLoop.scheduler()
    };
    if (!noSetTiming) {
        if (fps && fps > 0)_emscripten_set_main_loop_timing(0, 1e3 / fps); else _emscripten_set_main_loop_timing(1, 1);
        Browser.mainLoop.scheduler()
    }
    if (simulateInfiniteLoop) {
        throw"SimulateInfiniteLoop"
    }
}
var Browser = {
    mainLoop: {
        scheduler: null,
        method: "",
        currentlyRunningMainloop: 0,
        func: null,
        arg: 0,
        timingMode: 0,
        timingValue: 0,
        currentFrameNumber: 0,
        queue: [],
        pause: (function () {
            Browser.mainLoop.scheduler = null;
            Browser.mainLoop.currentlyRunningMainloop++
        }),
        resume: (function () {
            Browser.mainLoop.currentlyRunningMainloop++;
            var timingMode = Browser.mainLoop.timingMode;
            var timingValue = Browser.mainLoop.timingValue;
            var func = Browser.mainLoop.func;
            Browser.mainLoop.func = null;
            _emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true);
            _emscripten_set_main_loop_timing(timingMode, timingValue);
            Browser.mainLoop.scheduler()
        }),
        updateStatus: (function () {
            if (Module["setStatus"]) {
                var message = Module["statusMessage"] || "Please wait...";
                var remaining = Browser.mainLoop.remainingBlockers;
                var expected = Browser.mainLoop.expectedBlockers;
                if (remaining) {
                    if (remaining < expected) {
                        Module["setStatus"](message + " (" + (expected - remaining) + "/" + expected + ")")
                    } else {
                        Module["setStatus"](message)
                    }
                } else {
                    Module["setStatus"]("")
                }
            }
        }),
        runIter: (function (func) {
            if (ABORT)return;
            if (Module["preMainLoop"]) {
                var preRet = Module["preMainLoop"]();
                if (preRet === false) {
                    return
                }
            }
            try {
                func()
            } catch (e) {
                if (e instanceof ExitStatus) {
                    return
                } else {
                    if (e && typeof e === "object" && e.stack)Module.printErr("exception thrown: " + [e, e.stack]);
                    throw e
                }
            }
            if (Module["postMainLoop"])Module["postMainLoop"]()
        })
    },
    isFullScreen: false,
    pointerLock: false,
    moduleContextCreatedCallbacks: [],
    workers: [],
    init: (function () {
        if (!Module["preloadPlugins"])Module["preloadPlugins"] = [];
        if (Browser.initted)return;
        Browser.initted = true;
        try {
            new Blob;
            Browser.hasBlobConstructor = true
        } catch (e) {
            Browser.hasBlobConstructor = false;
            console.log("warning: no blob constructor, cannot create blobs with mimetypes")
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : !Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null;
        Browser.URLObject = typeof window != "undefined" ? window.URL ? window.URL : window.webkitURL : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === "undefined") {
            console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
            Module.noImageDecoding = true
        }
        var imagePlugin = {};
        imagePlugin["canHandle"] = function imagePlugin_canHandle(name) {
            return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name)
        };
        imagePlugin["handle"] = function imagePlugin_handle(byteArray, name, onload, onerror) {
            var b = null;
            if (Browser.hasBlobConstructor) {
                try {
                    b = new Blob([byteArray], {type: Browser.getMimetype(name)});
                    if (b.size !== byteArray.length) {
                        b = new Blob([(new Uint8Array(byteArray)).buffer], {type: Browser.getMimetype(name)})
                    }
                } catch (e) {
                    Runtime.warnOnce("Blob constructor present but fails: " + e + "; falling back to blob builder")
                }
            }
            if (!b) {
                var bb = new Browser.BlobBuilder;
                bb.append((new Uint8Array(byteArray)).buffer);
                b = bb.getBlob()
            }
            var url = Browser.URLObject.createObjectURL(b);
            var img = new Image;
            img.onload = function img_onload() {
                assert(img.complete, "Image " + name + " could not be decoded");
                var canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                var ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                Module["preloadedImages"][name] = canvas;
                Browser.URLObject.revokeObjectURL(url);
                if (onload)onload(byteArray)
            };
            img.onerror = function img_onerror(event) {
                console.log("Image " + url + " could not be decoded");
                if (onerror)onerror()
            };
            img.src = url
        };
        Module["preloadPlugins"].push(imagePlugin);
        var audioPlugin = {};
        audioPlugin["canHandle"] = function audioPlugin_canHandle(name) {
            return !Module.noAudioDecoding && name.substr(-4) in {".ogg": 1, ".wav": 1, ".mp3": 1}
        };
        audioPlugin["handle"] = function audioPlugin_handle(byteArray, name, onload, onerror) {
            var done = false;

            function finish(audio) {
                if (done)return;
                done = true;
                Module["preloadedAudios"][name] = audio;
                if (onload)onload(byteArray)
            }

            function fail() {
                if (done)return;
                done = true;
                Module["preloadedAudios"][name] = new Audio;
                if (onerror)onerror()
            }

            if (Browser.hasBlobConstructor) {
                try {
                    var b = new Blob([byteArray], {type: Browser.getMimetype(name)})
                } catch (e) {
                    return fail()
                }
                var url = Browser.URLObject.createObjectURL(b);
                var audio = new Audio;
                audio.addEventListener("canplaythrough", (function () {
                    finish(audio)
                }), false);
                audio.onerror = function audio_onerror(event) {
                    if (done)return;
                    console.log("warning: browser could not fully decode audio " + name + ", trying slower base64 approach");
                    function encode64(data) {
                        var BASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
                        var PAD = "=";
                        var ret = "";
                        var leftchar = 0;
                        var leftbits = 0;
                        for (var i = 0; i < data.length; i++) {
                            leftchar = leftchar << 8 | data[i];
                            leftbits += 8;
                            while (leftbits >= 6) {
                                var curr = leftchar >> leftbits - 6 & 63;
                                leftbits -= 6;
                                ret += BASE[curr]
                            }
                        }
                        if (leftbits == 2) {
                            ret += BASE[(leftchar & 3) << 4];
                            ret += PAD + PAD
                        } else if (leftbits == 4) {
                            ret += BASE[(leftchar & 15) << 2];
                            ret += PAD
                        }
                        return ret
                    }

                    audio.src = "data:audio/x-" + name.substr(-3) + ";base64," + encode64(byteArray);
                    finish(audio)
                };
                audio.src = url;
                Browser.safeSetTimeout((function () {
                    finish(audio)
                }), 1e4)
            } else {
                return fail()
            }
        };
        Module["preloadPlugins"].push(audioPlugin);
        var canvas = Module["canvas"];

        function pointerLockChange() {
            Browser.pointerLock = document["pointerLockElement"] === canvas || document["mozPointerLockElement"] === canvas || document["webkitPointerLockElement"] === canvas || document["msPointerLockElement"] === canvas
        }

        if (canvas) {
            canvas.requestPointerLock = canvas["requestPointerLock"] || canvas["mozRequestPointerLock"] || canvas["webkitRequestPointerLock"] || canvas["msRequestPointerLock"] || (function () {
                });
            canvas.exitPointerLock = document["exitPointerLock"] || document["mozExitPointerLock"] || document["webkitExitPointerLock"] || document["msExitPointerLock"] || (function () {
                });
            canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
            document.addEventListener("pointerlockchange", pointerLockChange, false);
            document.addEventListener("mozpointerlockchange", pointerLockChange, false);
            document.addEventListener("webkitpointerlockchange", pointerLockChange, false);
            document.addEventListener("mspointerlockchange", pointerLockChange, false);
            if (Module["elementPointerLock"]) {
                canvas.addEventListener("click", (function (ev) {
                    if (!Browser.pointerLock && canvas.requestPointerLock) {
                        canvas.requestPointerLock();
                        ev.preventDefault()
                    }
                }), false)
            }
        }
    }),
    createContext: (function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        if (useWebGL && Module.ctx && canvas == Module.canvas)return Module.ctx;
        var ctx;
        var contextHandle;
        if (useWebGL) {
            var contextAttributes = {antialias: false, alpha: false};
            if (webGLContextAttributes) {
                for (var attribute in webGLContextAttributes) {
                    contextAttributes[attribute] = webGLContextAttributes[attribute]
                }
            }
            contextHandle = GL.createContext(canvas, contextAttributes);
            if (contextHandle) {
                ctx = GL.getContext(contextHandle).GLctx
            }
            canvas.style.backgroundColor = "black"
        } else {
            ctx = canvas.getContext("2d")
        }
        if (!ctx)return null;
        if (setInModule) {
            if (!useWebGL)assert(typeof GLctx === "undefined", "cannot set in module if GLctx is used, but we are a non-GL context that would replace it");
            Module.ctx = ctx;
            if (useWebGL)GL.makeContextCurrent(contextHandle);
            Module.useWebGL = useWebGL;
            Browser.moduleContextCreatedCallbacks.forEach((function (callback) {
                callback()
            }));
            Browser.init()
        }
        return ctx
    }),
    destroyContext: (function (canvas, useWebGL, setInModule) {
    }),
    fullScreenHandlersInstalled: false,
    lockPointer: undefined,
    resizeCanvas: undefined,
    requestFullScreen: (function (lockPointer, resizeCanvas, vrDevice) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        Browser.vrDevice = vrDevice;
        if (typeof Browser.lockPointer === "undefined")Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === "undefined")Browser.resizeCanvas = false;
        if (typeof Browser.vrDevice === "undefined")Browser.vrDevice = null;
        var canvas = Module["canvas"];

        function fullScreenChange() {
            Browser.isFullScreen = false;
            var canvasContainer = canvas.parentNode;
            if ((document["webkitFullScreenElement"] || document["webkitFullscreenElement"] || document["mozFullScreenElement"] || document["mozFullscreenElement"] || document["fullScreenElement"] || document["fullscreenElement"] || document["msFullScreenElement"] || document["msFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvasContainer) {
                canvas.cancelFullScreen = document["cancelFullScreen"] || document["mozCancelFullScreen"] || document["webkitCancelFullScreen"] || document["msExitFullscreen"] || document["exitFullscreen"] || (function () {
                    });
                canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
                if (Browser.lockPointer)canvas.requestPointerLock();
                Browser.isFullScreen = true;
                if (Browser.resizeCanvas)Browser.setFullScreenCanvasSize()
            } else {
                canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
                canvasContainer.parentNode.removeChild(canvasContainer);
                if (Browser.resizeCanvas)Browser.setWindowedCanvasSize()
            }
            if (Module["onFullScreen"])Module["onFullScreen"](Browser.isFullScreen);
            Browser.updateCanvasDimensions(canvas)
        }

        if (!Browser.fullScreenHandlersInstalled) {
            Browser.fullScreenHandlersInstalled = true;
            document.addEventListener("fullscreenchange", fullScreenChange, false);
            document.addEventListener("mozfullscreenchange", fullScreenChange, false);
            document.addEventListener("webkitfullscreenchange", fullScreenChange, false);
            document.addEventListener("MSFullscreenChange", fullScreenChange, false)
        }
        var canvasContainer = document.createElement("div");
        canvas.parentNode.insertBefore(canvasContainer, canvas);
        canvasContainer.appendChild(canvas);
        canvasContainer.requestFullScreen = canvasContainer["requestFullScreen"] || canvasContainer["mozRequestFullScreen"] || canvasContainer["msRequestFullscreen"] || (canvasContainer["webkitRequestFullScreen"] ? (function () {
                canvasContainer["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"])
            }) : null);
        if (vrDevice) {
            canvasContainer.requestFullScreen({vrDisplay: vrDevice})
        } else {
            canvasContainer.requestFullScreen()
        }
    }),
    nextRAF: 0,
    fakeRequestAnimationFrame: (function (func) {
        var now = Date.now();
        if (Browser.nextRAF === 0) {
            Browser.nextRAF = now + 1e3 / 60
        } else {
            while (now + 2 >= Browser.nextRAF) {
                Browser.nextRAF += 1e3 / 60
            }
        }
        var delay = Math.max(Browser.nextRAF - now, 0);
        setTimeout(func, delay)
    }),
    requestAnimationFrame: function requestAnimationFrame(func) {
        if (typeof window === "undefined") {
            Browser.fakeRequestAnimationFrame(func)
        } else {
            if (!window.requestAnimationFrame) {
                window.requestAnimationFrame = window["requestAnimationFrame"] || window["mozRequestAnimationFrame"] || window["webkitRequestAnimationFrame"] || window["msRequestAnimationFrame"] || window["oRequestAnimationFrame"] || Browser.fakeRequestAnimationFrame
            }
            window.requestAnimationFrame(func)
        }
    },
    safeCallback: (function (func) {
        return (function () {
            if (!ABORT)return func.apply(null, arguments)
        })
    }),
    allowAsyncCallbacks: true,
    queuedAsyncCallbacks: [],
    pauseAsyncCallbacks: (function () {
        Browser.allowAsyncCallbacks = false
    }),
    resumeAsyncCallbacks: (function () {
        Browser.allowAsyncCallbacks = true;
        if (Browser.queuedAsyncCallbacks.length > 0) {
            var callbacks = Browser.queuedAsyncCallbacks;
            Browser.queuedAsyncCallbacks = [];
            callbacks.forEach((function (func) {
                func()
            }))
        }
    }),
    safeRequestAnimationFrame: (function (func) {
        return Browser.requestAnimationFrame((function () {
            if (ABORT)return;
            if (Browser.allowAsyncCallbacks) {
                func()
            } else {
                Browser.queuedAsyncCallbacks.push(func)
            }
        }))
    }),
    safeSetTimeout: (function (func, timeout) {
        Module["noExitRuntime"] = true;
        return setTimeout((function () {
            if (ABORT)return;
            if (Browser.allowAsyncCallbacks) {
                func()
            } else {
                Browser.queuedAsyncCallbacks.push(func)
            }
        }), timeout)
    }),
    safeSetInterval: (function (func, timeout) {
        Module["noExitRuntime"] = true;
        return setInterval((function () {
            if (ABORT)return;
            if (Browser.allowAsyncCallbacks) {
                func()
            }
        }), timeout)
    }),
    getMimetype: (function (name) {
        return {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "bmp": "image/bmp",
            "ogg": "audio/ogg",
            "wav": "audio/wav",
            "mp3": "audio/mpeg"
        }[name.substr(name.lastIndexOf(".") + 1)]
    }),
    getUserMedia: (function (func) {
        if (!window.getUserMedia) {
            window.getUserMedia = navigator["getUserMedia"] || navigator["mozGetUserMedia"]
        }
        window.getUserMedia(func)
    }),
    getMovementX: (function (event) {
        return event["movementX"] || event["mozMovementX"] || event["webkitMovementX"] || 0
    }),
    getMovementY: (function (event) {
        return event["movementY"] || event["mozMovementY"] || event["webkitMovementY"] || 0
    }),
    getMouseWheelDelta: (function (event) {
        var delta = 0;
        switch (event.type) {
            case"DOMMouseScroll":
                delta = event.detail;
                break;
            case"mousewheel":
                delta = event.wheelDelta;
                break;
            case"wheel":
                delta = event["deltaY"];
                break;
            default:
                throw"unrecognized mouse wheel event: " + event.type
        }
        return delta
    }),
    mouseX: 0,
    mouseY: 0,
    mouseMovementX: 0,
    mouseMovementY: 0,
    touches: {},
    lastTouches: {},
    calculateMouseEvent: (function (event) {
        if (Browser.pointerLock) {
            if (event.type != "mousemove" && "mozMovementX" in event) {
                Browser.mouseMovementX = Browser.mouseMovementY = 0
            } else {
                Browser.mouseMovementX = Browser.getMovementX(event);
                Browser.mouseMovementY = Browser.getMovementY(event)
            }
            if (typeof SDL != "undefined") {
                Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
                Browser.mouseY = SDL.mouseY + Browser.mouseMovementY
            } else {
                Browser.mouseX += Browser.mouseMovementX;
                Browser.mouseY += Browser.mouseMovementY
            }
        } else {
            var rect = Module["canvas"].getBoundingClientRect();
            var cw = Module["canvas"].width;
            var ch = Module["canvas"].height;
            var scrollX = typeof window.scrollX !== "undefined" ? window.scrollX : window.pageXOffset;
            var scrollY = typeof window.scrollY !== "undefined" ? window.scrollY : window.pageYOffset;
            if (event.type === "touchstart" || event.type === "touchend" || event.type === "touchmove") {
                var touch = event.touch;
                if (touch === undefined) {
                    return
                }
                var adjustedX = touch.pageX - (scrollX + rect.left);
                var adjustedY = touch.pageY - (scrollY + rect.top);
                adjustedX = adjustedX * (cw / rect.width);
                adjustedY = adjustedY * (ch / rect.height);
                var coords = {x: adjustedX, y: adjustedY};
                if (event.type === "touchstart") {
                    Browser.lastTouches[touch.identifier] = coords;
                    Browser.touches[touch.identifier] = coords
                } else if (event.type === "touchend" || event.type === "touchmove") {
                    var last = Browser.touches[touch.identifier];
                    if (!last)last = coords;
                    Browser.lastTouches[touch.identifier] = last;
                    Browser.touches[touch.identifier] = coords
                }
                return
            }
            var x = event.pageX - (scrollX + rect.left);
            var y = event.pageY - (scrollY + rect.top);
            x = x * (cw / rect.width);
            y = y * (ch / rect.height);
            Browser.mouseMovementX = x - Browser.mouseX;
            Browser.mouseMovementY = y - Browser.mouseY;
            Browser.mouseX = x;
            Browser.mouseY = y
        }
    }),
    xhrLoad: (function (url, onload, onerror) {
        var xhr = new XMLHttpRequest;
        xhr.open("GET", url, true);
        xhr.responseType = "arraybuffer";
        xhr.onload = function xhr_onload() {
            if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                onload(xhr.response)
            } else {
                onerror()
            }
        };
        xhr.onerror = onerror;
        xhr.send(null)
    }),
    asyncLoad: (function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, (function (arrayBuffer) {
            assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
            onload(new Uint8Array(arrayBuffer));
            if (!noRunDep)removeRunDependency("al " + url)
        }), (function (event) {
            if (onerror) {
                onerror()
            } else {
                throw'Loading data file "' + url + '" failed.'
            }
        }));
        if (!noRunDep)addRunDependency("al " + url)
    }),
    resizeListeners: [],
    updateResizeListeners: (function () {
        var canvas = Module["canvas"];
        Browser.resizeListeners.forEach((function (listener) {
            listener(canvas.width, canvas.height)
        }))
    }),
    setCanvasSize: (function (width, height, noUpdates) {
        var canvas = Module["canvas"];
        Browser.updateCanvasDimensions(canvas, width, height);
        if (!noUpdates)Browser.updateResizeListeners()
    }),
    windowedWidth: 0,
    windowedHeight: 0,
    setFullScreenCanvasSize: (function () {
        if (typeof SDL != "undefined") {
            var flags = HEAPU32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2];
            flags = flags | 8388608;
            HEAP32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2] = flags
        }
        Browser.updateResizeListeners()
    }),
    setWindowedCanvasSize: (function () {
        if (typeof SDL != "undefined") {
            var flags = HEAPU32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2];
            flags = flags & ~8388608;
            HEAP32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2] = flags
        }
        Browser.updateResizeListeners()
    }),
    updateCanvasDimensions: (function (canvas, wNative, hNative) {
        if (wNative && hNative) {
            canvas.widthNative = wNative;
            canvas.heightNative = hNative
        } else {
            wNative = canvas.widthNative;
            hNative = canvas.heightNative
        }
        var w = wNative;
        var h = hNative;
        if (Module["forcedAspectRatio"] && Module["forcedAspectRatio"] > 0) {
            if (w / h < Module["forcedAspectRatio"]) {
                w = Math.round(h * Module["forcedAspectRatio"])
            } else {
                h = Math.round(w / Module["forcedAspectRatio"])
            }
        }
        if ((document["webkitFullScreenElement"] || document["webkitFullscreenElement"] || document["mozFullScreenElement"] || document["mozFullscreenElement"] || document["fullScreenElement"] || document["fullscreenElement"] || document["msFullScreenElement"] || document["msFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvas.parentNode && typeof screen != "undefined") {
            var factor = Math.min(screen.width / w, screen.height / h);
            w = Math.round(w * factor);
            h = Math.round(h * factor)
        }
        if (Browser.resizeCanvas) {
            if (canvas.width != w)canvas.width = w;
            if (canvas.height != h)canvas.height = h;
            if (typeof canvas.style != "undefined") {
                canvas.style.removeProperty("width");
                canvas.style.removeProperty("height")
            }
        } else {
            if (canvas.width != wNative)canvas.width = wNative;
            if (canvas.height != hNative)canvas.height = hNative;
            if (typeof canvas.style != "undefined") {
                if (w != wNative || h != hNative) {
                    canvas.style.setProperty("width", w + "px", "important");
                    canvas.style.setProperty("height", h + "px", "important")
                } else {
                    canvas.style.removeProperty("width");
                    canvas.style.removeProperty("height")
                }
            }
        }
    }),
    wgetRequests: {},
    nextWgetRequestHandle: 0,
    getNextWgetRequestHandle: (function () {
        var handle = Browser.nextWgetRequestHandle;
        Browser.nextWgetRequestHandle++;
        return handle
    })
};
function _time(ptr) {
    var ret = Date.now() / 1e3 | 0;
    if (ptr) {
        HEAP32[ptr >> 2] = ret
    }
    return ret
}
function _pthread_self() {
    return 0
}
function ___syscall140(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
        var offset = offset_low;
        assert(offset_high === 0);
        FS.llseek(stream, offset, whence);
        HEAP32[result >> 2] = stream.position;
        if (stream.getdents && offset === 0 && whence === 0)stream.getdents = null;
        return 0
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))abort(e);
        return -e.errno
    }
}
function ___syscall146(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var stream = SYSCALLS.getStreamFromFD(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
        return SYSCALLS.doWritev(stream, iov, iovcnt)
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))abort(e);
        return -e.errno
    }
}
function ___syscall54(which, varargs) {
    SYSCALLS.varargs = varargs;
    try {
        var stream = SYSCALLS.getStreamFromFD(), op = SYSCALLS.get();
        switch (op) {
            case 21505:
            {
                if (!stream.tty)return -ERRNO_CODES.ENOTTY;
                return 0
            }
                ;
            case 21506:
            {
                if (!stream.tty)return -ERRNO_CODES.ENOTTY;
                return 0
            }
                ;
            case 21519:
            {
                if (!stream.tty)return -ERRNO_CODES.ENOTTY;
                var argp = SYSCALLS.get();
                HEAP32[argp >> 2] = 0;
                return 0
            }
                ;
            case 21520:
            {
                if (!stream.tty)return -ERRNO_CODES.ENOTTY;
                return -ERRNO_CODES.EINVAL
            }
                ;
            case 21531:
            {
                var argp = SYSCALLS.get();
                return FS.ioctl(stream, op, argp)
            }
                ;
            default:
                abort("bad ioctl syscall " + op)
        }
    } catch (e) {
        if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError))abort(e);
        return -e.errno
    }
}
FS.staticInit();
__ATINIT__.unshift((function () {
    if (!Module["noFSInit"] && !FS.init.initialized)FS.init()
}));
__ATMAIN__.push((function () {
    FS.ignorePermissions = false
}));
__ATEXIT__.push((function () {
    FS.quit()
}));
Module["FS_createFolder"] = FS.createFolder;
Module["FS_createPath"] = FS.createPath;
Module["FS_createDataFile"] = FS.createDataFile;
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
Module["FS_createLazyFile"] = FS.createLazyFile;
Module["FS_createLink"] = FS.createLink;
Module["FS_createDevice"] = FS.createDevice;
Module["FS_unlink"] = FS.unlink;
__ATINIT__.unshift((function () {
    TTY.init()
}));
__ATEXIT__.push((function () {
    TTY.shutdown()
}));
if (ENVIRONMENT_IS_NODE) {
    var fs = require("fs");
    var NODEJS_PATH = require("path");
    NODEFS.staticInit()
}
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas, vrDevice) {
    Browser.requestFullScreen(lockPointer, resizeCanvas, vrDevice)
};
Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) {
    Browser.requestAnimationFrame(func)
};
Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) {
    Browser.setCanvasSize(width, height, noUpdates)
};
Module["pauseMainLoop"] = function Module_pauseMainLoop() {
    Browser.mainLoop.pause()
};
Module["resumeMainLoop"] = function Module_resumeMainLoop() {
    Browser.mainLoop.resume()
};
Module["getUserMedia"] = function Module_getUserMedia() {
    Browser.getUserMedia()
};
Module["createContext"] = function Module_createContext(canvas, useWebGL, setInModule, webGLContextAttributes) {
    return Browser.createContext(canvas, useWebGL, setInModule, webGLContextAttributes)
};
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
staticSealed = true;
STACK_MAX = STACK_BASE + TOTAL_STACK;
DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);
assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");
function invoke_ii(index, a1) {
    try {
        return Module["dynCall_ii"](index, a1)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_iiii(index, a1, a2, a3) {
    try {
        return Module["dynCall_iiii"](index, a1, a2, a3)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")throw e;
        asm["setThrew"](1, 0)
    }
}
function invoke_vi(index, a1) {
    try {
        Module["dynCall_vi"](index, a1)
    } catch (e) {
        if (typeof e !== "number" && e !== "longjmp")throw e;
        asm["setThrew"](1, 0)
    }
}
Module.asmGlobalArg = {
    "Math": Math,
    "Int8Array": Int8Array,
    "Int16Array": Int16Array,
    "Int32Array": Int32Array,
    "Uint8Array": Uint8Array,
    "Uint16Array": Uint16Array,
    "Uint32Array": Uint32Array,
    "Float32Array": Float32Array,
    "Float64Array": Float64Array,
    "NaN": NaN,
    "Infinity": Infinity
};
Module.asmLibraryArg = {
    "abort": abort,
    "assert": assert,
    "invoke_ii": invoke_ii,
    "invoke_iiii": invoke_iiii,
    "invoke_vi": invoke_vi,
    "_pthread_cleanup_pop": _pthread_cleanup_pop,
    "_pthread_self": _pthread_self,
    "_sysconf": _sysconf,
    "___lock": ___lock,
    "___syscall6": ___syscall6,
    "___setErrNo": ___setErrNo,
    "_abort": _abort,
    "_sbrk": _sbrk,
    "_time": _time,
    "_pthread_cleanup_push": _pthread_cleanup_push,
    "_emscripten_memcpy_big": _emscripten_memcpy_big,
    "___syscall54": ___syscall54,
    "___unlock": ___unlock,
    "___syscall140": ___syscall140,
    "_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing,
    "_emscripten_set_main_loop": _emscripten_set_main_loop,
    "___syscall146": ___syscall146,
    "STACKTOP": STACKTOP,
    "STACK_MAX": STACK_MAX,
    "tempDoublePtr": tempDoublePtr,
    "ABORT": ABORT
};// EMSCRIPTEN_START_ASM
var asm = (function (global, env, buffer) {
    "use asm";
    var a = new global.Int8Array(buffer);
    var b = new global.Int16Array(buffer);
    var c = new global.Int32Array(buffer);
    var d = new global.Uint8Array(buffer);
    var e = new global.Uint16Array(buffer);
    var f = new global.Uint32Array(buffer);
    var g = new global.Float32Array(buffer);
    var h = new global.Float64Array(buffer);
    var i = env.STACKTOP | 0;
    var j = env.STACK_MAX | 0;
    var k = env.tempDoublePtr | 0;
    var l = env.ABORT | 0;
    var m = 0;
    var n = 0;
    var o = 0;
    var p = 0;
    var q = global.NaN, r = global.Infinity;
    var s = 0, t = 0, u = 0, v = 0, w = 0.0, x = 0, y = 0, z = 0, A = 0.0;
    var B = 0;
    var C = 0;
    var D = 0;
    var E = 0;
    var F = 0;
    var G = 0;
    var H = 0;
    var I = 0;
    var J = 0;
    var K = 0;
    var L = global.Math.floor;
    var M = global.Math.abs;
    var N = global.Math.sqrt;
    var O = global.Math.pow;
    var P = global.Math.cos;
    var Q = global.Math.sin;
    var R = global.Math.tan;
    var S = global.Math.acos;
    var T = global.Math.asin;
    var U = global.Math.atan;
    var V = global.Math.atan2;
    var W = global.Math.exp;
    var X = global.Math.log;
    var Y = global.Math.ceil;
    var Z = global.Math.imul;
    var _ = global.Math.min;
    var $ = global.Math.clz32;
    var aa = env.abort;
    var ba = env.assert;
    var ca = env.invoke_ii;
    var da = env.invoke_iiii;
    var ea = env.invoke_vi;
    var fa = env._pthread_cleanup_pop;
    var ga = env._pthread_self;
    var ha = env._sysconf;
    var ia = env.___lock;
    var ja = env.___syscall6;
    var ka = env.___setErrNo;
    var la = env._abort;
    var ma = env._sbrk;
    var na = env._time;
    var oa = env._pthread_cleanup_push;
    var pa = env._emscripten_memcpy_big;
    var qa = env.___syscall54;
    var ra = env.___unlock;
    var sa = env.___syscall140;
    var ta = env._emscripten_set_main_loop_timing;
    var ua = env._emscripten_set_main_loop;
    var va = env.___syscall146;
    var wa = 0.0;
// EMSCRIPTEN_START_FUNCS
    function Aa(a) {
        a = a | 0;
        var b = 0;
        b = i;
        i = i + a | 0;
        i = i + 15 & -16;
        return b | 0
    }

    function Ba() {
        return i | 0
    }

    function Ca(a) {
        a = a | 0;
        i = a
    }

    function Da(a, b) {
        a = a | 0;
        b = b | 0;
        i = a;
        j = b
    }

    function Ea(a, b) {
        a = a | 0;
        b = b | 0;
        if (!m) {
            m = a;
            n = b
        }
    }

    function Fa(b) {
        b = b | 0;
        a[k >> 0] = a[b >> 0];
        a[k + 1 >> 0] = a[b + 1 >> 0];
        a[k + 2 >> 0] = a[b + 2 >> 0];
        a[k + 3 >> 0] = a[b + 3 >> 0]
    }

    function Ga(b) {
        b = b | 0;
        a[k >> 0] = a[b >> 0];
        a[k + 1 >> 0] = a[b + 1 >> 0];
        a[k + 2 >> 0] = a[b + 2 >> 0];
        a[k + 3 >> 0] = a[b + 3 >> 0];
        a[k + 4 >> 0] = a[b + 4 >> 0];
        a[k + 5 >> 0] = a[b + 5 >> 0];
        a[k + 6 >> 0] = a[b + 6 >> 0];
        a[k + 7 >> 0] = a[b + 7 >> 0]
    }

    function Ha(a) {
        a = a | 0;
        B = a
    }

    function Ia() {
        return B | 0
    }

    function Ja(b, c) {
        b = b | 0;
        c = c | 0;
        var d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0;
        d = c;
        c = b;
        e = a[b >> 0] | 0;
        b = 0;
        a:while (1) {
            if (!(e << 24 >> 24)) {
                f = d;
                g = 13;
                break
            }
            b:do if (!b) {
                h = e;
                i = c;
                j = d;
                while (1) {
                    k = a[j >> 0] | 0;
                    switch (k << 24 >> 24) {
                        case 42:
                        {
                            l = h;
                            m = i;
                            n = j;
                            break b;
                            break
                        }
                        case 63:
                            break;
                        default:
                            if (k << 24 >> 24 != h << 24 >> 24) {
                                o = 0;
                                g = 15;
                                break a
                            }
                    }
                    i = i + 1 | 0;
                    k = j + 1 | 0;
                    h = a[i >> 0] | 0;
                    if (!(h << 24 >> 24)) {
                        f = k;
                        g = 13;
                        break a
                    } else j = k
                }
            } else {
                j = c;
                h = e;
                while (1) {
                    i = h;
                    k = j;
                    p = d;
                    c:while (1) {
                        q = a[p >> 0] | 0;
                        switch (q << 24 >> 24) {
                            case 42:
                            {
                                l = i;
                                m = k;
                                n = p;
                                break b;
                                break
                            }
                            case 63:
                                break;
                            default:
                                if (q << 24 >> 24 != i << 24 >> 24)break c
                        }
                        k = k + 1 | 0;
                        q = p + 1 | 0;
                        i = a[k >> 0] | 0;
                        if (!(i << 24 >> 24)) {
                            f = q;
                            g = 13;
                            break a
                        } else p = q
                    }
                    j = j + 1 | 0;
                    h = a[j >> 0] | 0;
                    if (!(h << 24 >> 24)) {
                        f = d;
                        g = 13;
                        break a
                    }
                }
            } while (0);
            d = n + 1 | 0;
            if (!(a[d >> 0] | 0)) {
                o = 1;
                g = 15;
                break
            } else {
                c = m;
                e = l;
                b = 1
            }
        }
        if ((g | 0) == 13) {
            while (1) {
                g = 0;
                b = a[f >> 0] | 0;
                l = b << 24 >> 24 == 0;
                if (b << 24 >> 24 == 42 & (l ^ 1)) {
                    f = f + 1 | 0;
                    g = 13
                } else {
                    r = l;
                    break
                }
            }
            o = r & 1;
            return o | 0
        } else if ((g | 0) == 15)return o | 0;
        return 0
    }

    function Ka() {
        var a = 0;
        if (!(c[2] | 0))a = 56; else a = c[(ga() | 0) + 60 >> 2] | 0;
        return a | 0
    }

    function La(a) {
        a = a | 0;
        var b = 0;
        if (a >>> 0 > 4294963200) {
            c[(Ka() | 0) >> 2] = 0 - a;
            b = -1
        } else b = a;
        return b | 0
    }

    function Ma(a) {
        a = a | 0;
        var b = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0;
        do if (a) {
            if ((c[a + 76 >> 2] | 0) <= -1) {
                b = Ta(a) | 0;
                break
            }
            d = (Na(a) | 0) == 0;
            e = Ta(a) | 0;
            if (d)b = e; else {
                Oa(a);
                b = e
            }
        } else {
            if (!(c[13] | 0))f = 0; else f = Ma(c[13] | 0) | 0;
            ia(36);
            e = c[8] | 0;
            if (!e)g = f; else {
                d = e;
                e = f;
                while (1) {
                    if ((c[d + 76 >> 2] | 0) > -1)h = Na(d) | 0; else h = 0;
                    if ((c[d + 20 >> 2] | 0) >>> 0 > (c[d + 28 >> 2] | 0) >>> 0)i = Ta(d) | 0 | e; else i = e;
                    if (h)Oa(d);
                    d = c[d + 56 >> 2] | 0;
                    if (!d) {
                        g = i;
                        break
                    } else e = i
                }
            }
            ra(36);
            b = g
        } while (0);
        return b | 0
    }

    function Na(a) {
        a = a | 0;
        return 0
    }

    function Oa(a) {
        a = a | 0;
        return
    }

    function Pa(a) {
        a = a | 0;
        var b = 0, d = 0;
        b = i;
        i = i + 16 | 0;
        d = b;
        c[d >> 2] = c[a + 60 >> 2];
        a = La(ja(6, d | 0) | 0) | 0;
        i = b;
        return a | 0
    }

    function Qa(a, b, d) {
        a = a | 0;
        b = b | 0;
        d = d | 0;
        var e = 0, f = 0, g = 0, h = 0;
        e = i;
        i = i + 32 | 0;
        f = e;
        g = e + 20 | 0;
        c[f >> 2] = c[a + 60 >> 2];
        c[f + 4 >> 2] = 0;
        c[f + 8 >> 2] = b;
        c[f + 12 >> 2] = g;
        c[f + 16 >> 2] = d;
        if ((La(sa(140, f | 0) | 0) | 0) < 0) {
            c[g >> 2] = -1;
            h = -1
        } else h = c[g >> 2] | 0;
        i = e;
        return h | 0
    }

    function Ra(a, b, d) {
        a = a | 0;
        b = b | 0;
        d = d | 0;
        var e = 0, f = 0, g = 0, h = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0;
        e = i;
        i = i + 48 | 0;
        f = e + 16 | 0;
        g = e;
        h = e + 32 | 0;
        j = a + 28 | 0;
        k = c[j >> 2] | 0;
        c[h >> 2] = k;
        l = a + 20 | 0;
        m = (c[l >> 2] | 0) - k | 0;
        c[h + 4 >> 2] = m;
        c[h + 8 >> 2] = b;
        c[h + 12 >> 2] = d;
        b = a + 60 | 0;
        k = a + 44 | 0;
        n = h;
        h = 2;
        o = m + d | 0;
        while (1) {
            if (!(c[2] | 0)) {
                c[f >> 2] = c[b >> 2];
                c[f + 4 >> 2] = n;
                c[f + 8 >> 2] = h;
                p = La(va(146, f | 0) | 0) | 0
            } else {
                oa(1, a | 0);
                c[g >> 2] = c[b >> 2];
                c[g + 4 >> 2] = n;
                c[g + 8 >> 2] = h;
                m = La(va(146, g | 0) | 0) | 0;
                fa(0);
                p = m
            }
            if ((o | 0) == (p | 0)) {
                q = 6;
                break
            }
            if ((p | 0) < 0) {
                r = n;
                s = h;
                q = 8;
                break
            }
            m = o - p | 0;
            t = c[n + 4 >> 2] | 0;
            if (p >>> 0 <= t >>> 0)if ((h | 0) == 2) {
                c[j >> 2] = (c[j >> 2] | 0) + p;
                u = t;
                v = p;
                w = n;
                x = 2
            } else {
                u = t;
                v = p;
                w = n;
                x = h
            } else {
                y = c[k >> 2] | 0;
                c[j >> 2] = y;
                c[l >> 2] = y;
                u = c[n + 12 >> 2] | 0;
                v = p - t | 0;
                w = n + 8 | 0;
                x = h + -1 | 0
            }
            c[w >> 2] = (c[w >> 2] | 0) + v;
            c[w + 4 >> 2] = u - v;
            n = w;
            h = x;
            o = m
        }
        if ((q | 0) == 6) {
            o = c[k >> 2] | 0;
            c[a + 16 >> 2] = o + (c[a + 48 >> 2] | 0);
            k = o;
            c[j >> 2] = k;
            c[l >> 2] = k;
            z = d
        } else if ((q | 0) == 8) {
            c[a + 16 >> 2] = 0;
            c[j >> 2] = 0;
            c[l >> 2] = 0;
            c[a >> 2] = c[a >> 2] | 32;
            if ((s | 0) == 2)z = 0; else z = d - (c[r + 4 >> 2] | 0) | 0
        }
        i = e;
        return z | 0
    }

    function Sa(b, d, e) {
        b = b | 0;
        d = d | 0;
        e = e | 0;
        var f = 0, g = 0;
        f = i;
        i = i + 80 | 0;
        g = f;
        c[b + 36 >> 2] = 3;
        if ((c[b >> 2] & 64 | 0) == 0 ? (c[g >> 2] = c[b + 60 >> 2], c[g + 4 >> 2] = 21505, c[g + 8 >> 2] = f + 12, (qa(54, g | 0) | 0) != 0) : 0)a[b + 75 >> 0] = -1;
        g = Ra(b, d, e) | 0;
        i = f;
        return g | 0
    }

    function Ta(a) {
        a = a | 0;
        var b = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0;
        b = a + 20 | 0;
        d = a + 28 | 0;
        if ((c[b >> 2] | 0) >>> 0 > (c[d >> 2] | 0) >>> 0 ? (ya[c[a + 36 >> 2] & 3](a, 0, 0) | 0, (c[b >> 2] | 0) == 0) : 0)e = -1; else {
            f = a + 4 | 0;
            g = c[f >> 2] | 0;
            h = a + 8 | 0;
            i = c[h >> 2] | 0;
            if (g >>> 0 < i >>> 0)ya[c[a + 40 >> 2] & 3](a, g - i | 0, 1) | 0;
            c[a + 16 >> 2] = 0;
            c[d >> 2] = 0;
            c[b >> 2] = 0;
            c[h >> 2] = 0;
            c[f >> 2] = 0;
            e = 0
        }
        return e | 0
    }

    function Ua(a) {
        a = a | 0;
        if (!(c[a + 68 >> 2] | 0))Oa(a);
        return
    }

    function Va(a) {
        a = a | 0;
        var b = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, L = 0, M = 0, N = 0, O = 0, P = 0, Q = 0, R = 0, S = 0, T = 0, U = 0, V = 0, W = 0, X = 0, Y = 0, Z = 0, _ = 0, $ = 0, aa = 0, ba = 0, ca = 0, da = 0, ea = 0, fa = 0, ga = 0, ia = 0, ja = 0, ka = 0, oa = 0, pa = 0, qa = 0, ra = 0, sa = 0, ta = 0, ua = 0, va = 0, wa = 0, xa = 0, ya = 0, za = 0, Aa = 0, Ba = 0, Ca = 0, Da = 0, Ea = 0, Fa = 0, Ga = 0, Ha = 0, Ia = 0, Ja = 0, La = 0, Ma = 0, Na = 0, Oa = 0, Pa = 0, Qa = 0, Ra = 0, Sa = 0, Ta = 0, Ua = 0, Va = 0, Wa = 0, Xa = 0;
        do if (a >>> 0 < 245) {
            b = a >>> 0 < 11 ? 16 : a + 11 & -8;
            d = b >>> 3;
            e = c[43] | 0;
            f = e >>> d;
            if (f & 3) {
                g = (f & 1 ^ 1) + d | 0;
                h = g << 1;
                i = 212 + (h << 2) | 0;
                j = 212 + (h + 2 << 2) | 0;
                h = c[j >> 2] | 0;
                k = h + 8 | 0;
                l = c[k >> 2] | 0;
                do if ((i | 0) != (l | 0)) {
                    if (l >>> 0 < (c[47] | 0) >>> 0)la();
                    m = l + 12 | 0;
                    if ((c[m >> 2] | 0) == (h | 0)) {
                        c[m >> 2] = i;
                        c[j >> 2] = l;
                        break
                    } else la()
                } else c[43] = e & ~(1 << g); while (0);
                l = g << 3;
                c[h + 4 >> 2] = l | 3;
                j = h + (l | 4) | 0;
                c[j >> 2] = c[j >> 2] | 1;
                n = k;
                return n | 0
            }
            j = c[45] | 0;
            if (b >>> 0 > j >>> 0) {
                if (f) {
                    l = 2 << d;
                    i = f << d & (l | 0 - l);
                    l = (i & 0 - i) + -1 | 0;
                    i = l >>> 12 & 16;
                    m = l >>> i;
                    l = m >>> 5 & 8;
                    o = m >>> l;
                    m = o >>> 2 & 4;
                    p = o >>> m;
                    o = p >>> 1 & 2;
                    q = p >>> o;
                    p = q >>> 1 & 1;
                    r = (l | i | m | o | p) + (q >>> p) | 0;
                    p = r << 1;
                    q = 212 + (p << 2) | 0;
                    o = 212 + (p + 2 << 2) | 0;
                    p = c[o >> 2] | 0;
                    m = p + 8 | 0;
                    i = c[m >> 2] | 0;
                    do if ((q | 0) != (i | 0)) {
                        if (i >>> 0 < (c[47] | 0) >>> 0)la();
                        l = i + 12 | 0;
                        if ((c[l >> 2] | 0) == (p | 0)) {
                            c[l >> 2] = q;
                            c[o >> 2] = i;
                            s = c[45] | 0;
                            break
                        } else la()
                    } else {
                        c[43] = e & ~(1 << r);
                        s = j
                    } while (0);
                    j = r << 3;
                    e = j - b | 0;
                    c[p + 4 >> 2] = b | 3;
                    i = p + b | 0;
                    c[p + (b | 4) >> 2] = e | 1;
                    c[p + j >> 2] = e;
                    if (s) {
                        j = c[48] | 0;
                        o = s >>> 3;
                        q = o << 1;
                        d = 212 + (q << 2) | 0;
                        f = c[43] | 0;
                        k = 1 << o;
                        if (f & k) {
                            o = 212 + (q + 2 << 2) | 0;
                            h = c[o >> 2] | 0;
                            if (h >>> 0 < (c[47] | 0) >>> 0)la(); else {
                                t = o;
                                u = h
                            }
                        } else {
                            c[43] = f | k;
                            t = 212 + (q + 2 << 2) | 0;
                            u = d
                        }
                        c[t >> 2] = j;
                        c[u + 12 >> 2] = j;
                        c[j + 8 >> 2] = u;
                        c[j + 12 >> 2] = d
                    }
                    c[45] = e;
                    c[48] = i;
                    n = m;
                    return n | 0
                }
                i = c[44] | 0;
                if (i) {
                    e = (i & 0 - i) + -1 | 0;
                    i = e >>> 12 & 16;
                    d = e >>> i;
                    e = d >>> 5 & 8;
                    j = d >>> e;
                    d = j >>> 2 & 4;
                    q = j >>> d;
                    j = q >>> 1 & 2;
                    k = q >>> j;
                    q = k >>> 1 & 1;
                    f = c[476 + ((e | i | d | j | q) + (k >>> q) << 2) >> 2] | 0;
                    q = (c[f + 4 >> 2] & -8) - b | 0;
                    k = f;
                    j = f;
                    while (1) {
                        f = c[k + 16 >> 2] | 0;
                        if (!f) {
                            d = c[k + 20 >> 2] | 0;
                            if (!d) {
                                v = q;
                                w = j;
                                break
                            } else x = d
                        } else x = f;
                        f = (c[x + 4 >> 2] & -8) - b | 0;
                        d = f >>> 0 < q >>> 0;
                        q = d ? f : q;
                        k = x;
                        j = d ? x : j
                    }
                    j = c[47] | 0;
                    if (w >>> 0 < j >>> 0)la();
                    k = w + b | 0;
                    if (w >>> 0 >= k >>> 0)la();
                    q = c[w + 24 >> 2] | 0;
                    m = c[w + 12 >> 2] | 0;
                    do if ((m | 0) == (w | 0)) {
                        p = w + 20 | 0;
                        r = c[p >> 2] | 0;
                        if (!r) {
                            d = w + 16 | 0;
                            f = c[d >> 2] | 0;
                            if (!f) {
                                y = 0;
                                break
                            } else {
                                z = f;
                                A = d
                            }
                        } else {
                            z = r;
                            A = p
                        }
                        while (1) {
                            p = z + 20 | 0;
                            r = c[p >> 2] | 0;
                            if (r) {
                                z = r;
                                A = p;
                                continue
                            }
                            p = z + 16 | 0;
                            r = c[p >> 2] | 0;
                            if (!r) {
                                B = z;
                                C = A;
                                break
                            } else {
                                z = r;
                                A = p
                            }
                        }
                        if (C >>> 0 < j >>> 0)la(); else {
                            c[C >> 2] = 0;
                            y = B;
                            break
                        }
                    } else {
                        p = c[w + 8 >> 2] | 0;
                        if (p >>> 0 < j >>> 0)la();
                        r = p + 12 | 0;
                        if ((c[r >> 2] | 0) != (w | 0))la();
                        d = m + 8 | 0;
                        if ((c[d >> 2] | 0) == (w | 0)) {
                            c[r >> 2] = m;
                            c[d >> 2] = p;
                            y = m;
                            break
                        } else la()
                    } while (0);
                    do if (q) {
                        m = c[w + 28 >> 2] | 0;
                        j = 476 + (m << 2) | 0;
                        if ((w | 0) == (c[j >> 2] | 0)) {
                            c[j >> 2] = y;
                            if (!y) {
                                c[44] = c[44] & ~(1 << m);
                                break
                            }
                        } else {
                            if (q >>> 0 < (c[47] | 0) >>> 0)la();
                            m = q + 16 | 0;
                            if ((c[m >> 2] | 0) == (w | 0))c[m >> 2] = y; else c[q + 20 >> 2] = y;
                            if (!y)break
                        }
                        m = c[47] | 0;
                        if (y >>> 0 < m >>> 0)la();
                        c[y + 24 >> 2] = q;
                        j = c[w + 16 >> 2] | 0;
                        do if (j)if (j >>> 0 < m >>> 0)la(); else {
                            c[y + 16 >> 2] = j;
                            c[j + 24 >> 2] = y;
                            break
                        } while (0);
                        j = c[w + 20 >> 2] | 0;
                        if (j)if (j >>> 0 < (c[47] | 0) >>> 0)la(); else {
                            c[y + 20 >> 2] = j;
                            c[j + 24 >> 2] = y;
                            break
                        }
                    } while (0);
                    if (v >>> 0 < 16) {
                        q = v + b | 0;
                        c[w + 4 >> 2] = q | 3;
                        j = w + (q + 4) | 0;
                        c[j >> 2] = c[j >> 2] | 1
                    } else {
                        c[w + 4 >> 2] = b | 3;
                        c[w + (b | 4) >> 2] = v | 1;
                        c[w + (v + b) >> 2] = v;
                        j = c[45] | 0;
                        if (j) {
                            q = c[48] | 0;
                            m = j >>> 3;
                            j = m << 1;
                            p = 212 + (j << 2) | 0;
                            d = c[43] | 0;
                            r = 1 << m;
                            if (d & r) {
                                m = 212 + (j + 2 << 2) | 0;
                                f = c[m >> 2] | 0;
                                if (f >>> 0 < (c[47] | 0) >>> 0)la(); else {
                                    D = m;
                                    E = f
                                }
                            } else {
                                c[43] = d | r;
                                D = 212 + (j + 2 << 2) | 0;
                                E = p
                            }
                            c[D >> 2] = q;
                            c[E + 12 >> 2] = q;
                            c[q + 8 >> 2] = E;
                            c[q + 12 >> 2] = p
                        }
                        c[45] = v;
                        c[48] = k
                    }
                    n = w + 8 | 0;
                    return n | 0
                } else F = b
            } else F = b
        } else if (a >>> 0 <= 4294967231) {
            p = a + 11 | 0;
            q = p & -8;
            j = c[44] | 0;
            if (j) {
                r = 0 - q | 0;
                d = p >>> 8;
                if (d)if (q >>> 0 > 16777215)G = 31; else {
                    p = (d + 1048320 | 0) >>> 16 & 8;
                    f = d << p;
                    d = (f + 520192 | 0) >>> 16 & 4;
                    m = f << d;
                    f = (m + 245760 | 0) >>> 16 & 2;
                    i = 14 - (d | p | f) + (m << f >>> 15) | 0;
                    G = q >>> (i + 7 | 0) & 1 | i << 1
                } else G = 0;
                i = c[476 + (G << 2) >> 2] | 0;
                a:do if (!i) {
                    H = r;
                    I = 0;
                    J = 0;
                    K = 86
                } else {
                    f = r;
                    m = 0;
                    p = q << ((G | 0) == 31 ? 0 : 25 - (G >>> 1) | 0);
                    d = i;
                    e = 0;
                    while (1) {
                        h = c[d + 4 >> 2] & -8;
                        o = h - q | 0;
                        if (o >>> 0 < f >>> 0)if ((h | 0) == (q | 0)) {
                            L = o;
                            M = d;
                            N = d;
                            K = 90;
                            break a
                        } else {
                            O = o;
                            P = d
                        } else {
                            O = f;
                            P = e
                        }
                        o = c[d + 20 >> 2] | 0;
                        d = c[d + 16 + (p >>> 31 << 2) >> 2] | 0;
                        h = (o | 0) == 0 | (o | 0) == (d | 0) ? m : o;
                        if (!d) {
                            H = O;
                            I = h;
                            J = P;
                            K = 86;
                            break
                        } else {
                            f = O;
                            m = h;
                            p = p << 1;
                            e = P
                        }
                    }
                } while (0);
                if ((K | 0) == 86) {
                    if ((I | 0) == 0 & (J | 0) == 0) {
                        i = 2 << G;
                        r = j & (i | 0 - i);
                        if (!r) {
                            F = q;
                            break
                        }
                        i = (r & 0 - r) + -1 | 0;
                        r = i >>> 12 & 16;
                        b = i >>> r;
                        i = b >>> 5 & 8;
                        k = b >>> i;
                        b = k >>> 2 & 4;
                        e = k >>> b;
                        k = e >>> 1 & 2;
                        p = e >>> k;
                        e = p >>> 1 & 1;
                        Q = c[476 + ((i | r | b | k | e) + (p >>> e) << 2) >> 2] | 0;
                        R = 0
                    } else {
                        Q = I;
                        R = J
                    }
                    if (!Q) {
                        S = H;
                        T = R
                    } else {
                        L = H;
                        M = Q;
                        N = R;
                        K = 90
                    }
                }
                if ((K | 0) == 90)while (1) {
                    K = 0;
                    e = (c[M + 4 >> 2] & -8) - q | 0;
                    p = e >>> 0 < L >>> 0;
                    k = p ? e : L;
                    e = p ? M : N;
                    p = c[M + 16 >> 2] | 0;
                    if (p) {
                        L = k;
                        M = p;
                        N = e;
                        K = 90;
                        continue
                    }
                    M = c[M + 20 >> 2] | 0;
                    if (!M) {
                        S = k;
                        T = e;
                        break
                    } else {
                        L = k;
                        N = e;
                        K = 90
                    }
                }
                if ((T | 0) != 0 ? S >>> 0 < ((c[45] | 0) - q | 0) >>> 0 : 0) {
                    j = c[47] | 0;
                    if (T >>> 0 < j >>> 0)la();
                    e = T + q | 0;
                    if (T >>> 0 >= e >>> 0)la();
                    k = c[T + 24 >> 2] | 0;
                    p = c[T + 12 >> 2] | 0;
                    do if ((p | 0) == (T | 0)) {
                        b = T + 20 | 0;
                        r = c[b >> 2] | 0;
                        if (!r) {
                            i = T + 16 | 0;
                            m = c[i >> 2] | 0;
                            if (!m) {
                                U = 0;
                                break
                            } else {
                                V = m;
                                W = i
                            }
                        } else {
                            V = r;
                            W = b
                        }
                        while (1) {
                            b = V + 20 | 0;
                            r = c[b >> 2] | 0;
                            if (r) {
                                V = r;
                                W = b;
                                continue
                            }
                            b = V + 16 | 0;
                            r = c[b >> 2] | 0;
                            if (!r) {
                                X = V;
                                Y = W;
                                break
                            } else {
                                V = r;
                                W = b
                            }
                        }
                        if (Y >>> 0 < j >>> 0)la(); else {
                            c[Y >> 2] = 0;
                            U = X;
                            break
                        }
                    } else {
                        b = c[T + 8 >> 2] | 0;
                        if (b >>> 0 < j >>> 0)la();
                        r = b + 12 | 0;
                        if ((c[r >> 2] | 0) != (T | 0))la();
                        i = p + 8 | 0;
                        if ((c[i >> 2] | 0) == (T | 0)) {
                            c[r >> 2] = p;
                            c[i >> 2] = b;
                            U = p;
                            break
                        } else la()
                    } while (0);
                    do if (k) {
                        p = c[T + 28 >> 2] | 0;
                        j = 476 + (p << 2) | 0;
                        if ((T | 0) == (c[j >> 2] | 0)) {
                            c[j >> 2] = U;
                            if (!U) {
                                c[44] = c[44] & ~(1 << p);
                                break
                            }
                        } else {
                            if (k >>> 0 < (c[47] | 0) >>> 0)la();
                            p = k + 16 | 0;
                            if ((c[p >> 2] | 0) == (T | 0))c[p >> 2] = U; else c[k + 20 >> 2] = U;
                            if (!U)break
                        }
                        p = c[47] | 0;
                        if (U >>> 0 < p >>> 0)la();
                        c[U + 24 >> 2] = k;
                        j = c[T + 16 >> 2] | 0;
                        do if (j)if (j >>> 0 < p >>> 0)la(); else {
                            c[U + 16 >> 2] = j;
                            c[j + 24 >> 2] = U;
                            break
                        } while (0);
                        j = c[T + 20 >> 2] | 0;
                        if (j)if (j >>> 0 < (c[47] | 0) >>> 0)la(); else {
                            c[U + 20 >> 2] = j;
                            c[j + 24 >> 2] = U;
                            break
                        }
                    } while (0);
                    b:do if (S >>> 0 >= 16) {
                        c[T + 4 >> 2] = q | 3;
                        c[T + (q | 4) >> 2] = S | 1;
                        c[T + (S + q) >> 2] = S;
                        k = S >>> 3;
                        if (S >>> 0 < 256) {
                            j = k << 1;
                            p = 212 + (j << 2) | 0;
                            b = c[43] | 0;
                            i = 1 << k;
                            if (b & i) {
                                k = 212 + (j + 2 << 2) | 0;
                                r = c[k >> 2] | 0;
                                if (r >>> 0 < (c[47] | 0) >>> 0)la(); else {
                                    Z = k;
                                    _ = r
                                }
                            } else {
                                c[43] = b | i;
                                Z = 212 + (j + 2 << 2) | 0;
                                _ = p
                            }
                            c[Z >> 2] = e;
                            c[_ + 12 >> 2] = e;
                            c[T + (q + 8) >> 2] = _;
                            c[T + (q + 12) >> 2] = p;
                            break
                        }
                        p = S >>> 8;
                        if (p)if (S >>> 0 > 16777215)$ = 31; else {
                            j = (p + 1048320 | 0) >>> 16 & 8;
                            i = p << j;
                            p = (i + 520192 | 0) >>> 16 & 4;
                            b = i << p;
                            i = (b + 245760 | 0) >>> 16 & 2;
                            r = 14 - (p | j | i) + (b << i >>> 15) | 0;
                            $ = S >>> (r + 7 | 0) & 1 | r << 1
                        } else $ = 0;
                        r = 476 + ($ << 2) | 0;
                        c[T + (q + 28) >> 2] = $;
                        c[T + (q + 20) >> 2] = 0;
                        c[T + (q + 16) >> 2] = 0;
                        i = c[44] | 0;
                        b = 1 << $;
                        if (!(i & b)) {
                            c[44] = i | b;
                            c[r >> 2] = e;
                            c[T + (q + 24) >> 2] = r;
                            c[T + (q + 12) >> 2] = e;
                            c[T + (q + 8) >> 2] = e;
                            break
                        }
                        b = c[r >> 2] | 0;
                        c:do if ((c[b + 4 >> 2] & -8 | 0) != (S | 0)) {
                            r = S << (($ | 0) == 31 ? 0 : 25 - ($ >>> 1) | 0);
                            i = b;
                            while (1) {
                                j = i + 16 + (r >>> 31 << 2) | 0;
                                p = c[j >> 2] | 0;
                                if (!p) {
                                    aa = j;
                                    ba = i;
                                    break
                                }
                                if ((c[p + 4 >> 2] & -8 | 0) == (S | 0)) {
                                    ca = p;
                                    break c
                                } else {
                                    r = r << 1;
                                    i = p
                                }
                            }
                            if (aa >>> 0 < (c[47] | 0) >>> 0)la(); else {
                                c[aa >> 2] = e;
                                c[T + (q + 24) >> 2] = ba;
                                c[T + (q + 12) >> 2] = e;
                                c[T + (q + 8) >> 2] = e;
                                break b
                            }
                        } else ca = b; while (0);
                        b = ca + 8 | 0;
                        i = c[b >> 2] | 0;
                        r = c[47] | 0;
                        if (i >>> 0 >= r >>> 0 & ca >>> 0 >= r >>> 0) {
                            c[i + 12 >> 2] = e;
                            c[b >> 2] = e;
                            c[T + (q + 8) >> 2] = i;
                            c[T + (q + 12) >> 2] = ca;
                            c[T + (q + 24) >> 2] = 0;
                            break
                        } else la()
                    } else {
                        i = S + q | 0;
                        c[T + 4 >> 2] = i | 3;
                        b = T + (i + 4) | 0;
                        c[b >> 2] = c[b >> 2] | 1
                    } while (0);
                    n = T + 8 | 0;
                    return n | 0
                } else F = q
            } else F = q
        } else F = -1; while (0);
        T = c[45] | 0;
        if (T >>> 0 >= F >>> 0) {
            S = T - F | 0;
            ca = c[48] | 0;
            if (S >>> 0 > 15) {
                c[48] = ca + F;
                c[45] = S;
                c[ca + (F + 4) >> 2] = S | 1;
                c[ca + T >> 2] = S;
                c[ca + 4 >> 2] = F | 3
            } else {
                c[45] = 0;
                c[48] = 0;
                c[ca + 4 >> 2] = T | 3;
                S = ca + (T + 4) | 0;
                c[S >> 2] = c[S >> 2] | 1
            }
            n = ca + 8 | 0;
            return n | 0
        }
        ca = c[46] | 0;
        if (ca >>> 0 > F >>> 0) {
            S = ca - F | 0;
            c[46] = S;
            ca = c[49] | 0;
            c[49] = ca + F;
            c[ca + (F + 4) >> 2] = S | 1;
            c[ca + 4 >> 2] = F | 3;
            n = ca + 8 | 0;
            return n | 0
        }
        do if (!(c[161] | 0)) {
            ca = ha(30) | 0;
            if (!(ca + -1 & ca)) {
                c[163] = ca;
                c[162] = ca;
                c[164] = -1;
                c[165] = -1;
                c[166] = 0;
                c[154] = 0;
                c[161] = (na(0) | 0) & -16 ^ 1431655768;
                break
            } else la()
        } while (0);
        ca = F + 48 | 0;
        S = c[163] | 0;
        T = F + 47 | 0;
        ba = S + T | 0;
        aa = 0 - S | 0;
        S = ba & aa;
        if (S >>> 0 <= F >>> 0) {
            n = 0;
            return n | 0
        }
        $ = c[153] | 0;
        if (($ | 0) != 0 ? (_ = c[151] | 0, Z = _ + S | 0, Z >>> 0 <= _ >>> 0 | Z >>> 0 > $ >>> 0) : 0) {
            n = 0;
            return n | 0
        }
        d:do if (!(c[154] & 4)) {
            $ = c[49] | 0;
            e:do if ($) {
                Z = 620;
                while (1) {
                    _ = c[Z >> 2] | 0;
                    if (_ >>> 0 <= $ >>> 0 ? (U = Z + 4 | 0, (_ + (c[U >> 2] | 0) | 0) >>> 0 > $ >>> 0) : 0) {
                        da = Z;
                        ea = U;
                        break
                    }
                    Z = c[Z + 8 >> 2] | 0;
                    if (!Z) {
                        K = 174;
                        break e
                    }
                }
                Z = ba - (c[46] | 0) & aa;
                if (Z >>> 0 < 2147483647) {
                    U = ma(Z | 0) | 0;
                    _ = (U | 0) == ((c[da >> 2] | 0) + (c[ea >> 2] | 0) | 0);
                    X = _ ? Z : 0;
                    if (_)if ((U | 0) == (-1 | 0))fa = X; else {
                        ga = U;
                        ia = X;
                        K = 194;
                        break d
                    } else {
                        ja = U;
                        ka = Z;
                        oa = X;
                        K = 184
                    }
                } else fa = 0
            } else K = 174; while (0);
            do if ((K | 0) == 174) {
                $ = ma(0) | 0;
                if (($ | 0) != (-1 | 0)) {
                    q = $;
                    X = c[162] | 0;
                    Z = X + -1 | 0;
                    if (!(Z & q))pa = S; else pa = S - q + (Z + q & 0 - X) | 0;
                    X = c[151] | 0;
                    q = X + pa | 0;
                    if (pa >>> 0 > F >>> 0 & pa >>> 0 < 2147483647) {
                        Z = c[153] | 0;
                        if ((Z | 0) != 0 ? q >>> 0 <= X >>> 0 | q >>> 0 > Z >>> 0 : 0) {
                            fa = 0;
                            break
                        }
                        Z = ma(pa | 0) | 0;
                        q = (Z | 0) == ($ | 0);
                        X = q ? pa : 0;
                        if (q) {
                            ga = $;
                            ia = X;
                            K = 194;
                            break d
                        } else {
                            ja = Z;
                            ka = pa;
                            oa = X;
                            K = 184
                        }
                    } else fa = 0
                } else fa = 0
            } while (0);
            f:do if ((K | 0) == 184) {
                X = 0 - ka | 0;
                do if (ca >>> 0 > ka >>> 0 & (ka >>> 0 < 2147483647 & (ja | 0) != (-1 | 0)) ? (Z = c[163] | 0, $ = T - ka + Z & 0 - Z, $ >>> 0 < 2147483647) : 0)if ((ma($ | 0) | 0) == (-1 | 0)) {
                    ma(X | 0) | 0;
                    fa = oa;
                    break f
                } else {
                    qa = $ + ka | 0;
                    break
                } else qa = ka; while (0);
                if ((ja | 0) == (-1 | 0))fa = oa; else {
                    ga = ja;
                    ia = qa;
                    K = 194;
                    break d
                }
            } while (0);
            c[154] = c[154] | 4;
            ra = fa;
            K = 191
        } else {
            ra = 0;
            K = 191
        } while (0);
        if ((((K | 0) == 191 ? S >>> 0 < 2147483647 : 0) ? (fa = ma(S | 0) | 0, S = ma(0) | 0, fa >>> 0 < S >>> 0 & ((fa | 0) != (-1 | 0) & (S | 0) != (-1 | 0))) : 0) ? (qa = S - fa | 0, S = qa >>> 0 > (F + 40 | 0) >>> 0, S) : 0) {
            ga = fa;
            ia = S ? qa : ra;
            K = 194
        }
        if ((K | 0) == 194) {
            ra = (c[151] | 0) + ia | 0;
            c[151] = ra;
            if (ra >>> 0 > (c[152] | 0) >>> 0)c[152] = ra;
            ra = c[49] | 0;
            g:do if (ra) {
                qa = 620;
                do {
                    S = c[qa >> 2] | 0;
                    fa = qa + 4 | 0;
                    ja = c[fa >> 2] | 0;
                    if ((ga | 0) == (S + ja | 0)) {
                        sa = S;
                        ta = fa;
                        ua = ja;
                        va = qa;
                        K = 204;
                        break
                    }
                    qa = c[qa + 8 >> 2] | 0
                } while ((qa | 0) != 0);
                if (((K | 0) == 204 ? (c[va + 12 >> 2] & 8 | 0) == 0 : 0) ? ra >>> 0 < ga >>> 0 & ra >>> 0 >= sa >>> 0 : 0) {
                    c[ta >> 2] = ua + ia;
                    qa = (c[46] | 0) + ia | 0;
                    ja = ra + 8 | 0;
                    fa = (ja & 7 | 0) == 0 ? 0 : 0 - ja & 7;
                    ja = qa - fa | 0;
                    c[49] = ra + fa;
                    c[46] = ja;
                    c[ra + (fa + 4) >> 2] = ja | 1;
                    c[ra + (qa + 4) >> 2] = 40;
                    c[50] = c[165];
                    break
                }
                qa = c[47] | 0;
                if (ga >>> 0 < qa >>> 0) {
                    c[47] = ga;
                    wa = ga
                } else wa = qa;
                qa = ga + ia | 0;
                ja = 620;
                while (1) {
                    if ((c[ja >> 2] | 0) == (qa | 0)) {
                        xa = ja;
                        ya = ja;
                        K = 212;
                        break
                    }
                    ja = c[ja + 8 >> 2] | 0;
                    if (!ja) {
                        za = 620;
                        break
                    }
                }
                if ((K | 0) == 212)if (!(c[ya + 12 >> 2] & 8)) {
                    c[xa >> 2] = ga;
                    ja = ya + 4 | 0;
                    c[ja >> 2] = (c[ja >> 2] | 0) + ia;
                    ja = ga + 8 | 0;
                    qa = (ja & 7 | 0) == 0 ? 0 : 0 - ja & 7;
                    ja = ga + (ia + 8) | 0;
                    fa = (ja & 7 | 0) == 0 ? 0 : 0 - ja & 7;
                    ja = ga + (fa + ia) | 0;
                    S = qa + F | 0;
                    oa = ga + S | 0;
                    ka = ja - (ga + qa) - F | 0;
                    c[ga + (qa + 4) >> 2] = F | 3;
                    h:do if ((ja | 0) != (ra | 0)) {
                        if ((ja | 0) == (c[48] | 0)) {
                            T = (c[45] | 0) + ka | 0;
                            c[45] = T;
                            c[48] = oa;
                            c[ga + (S + 4) >> 2] = T | 1;
                            c[ga + (T + S) >> 2] = T;
                            break
                        }
                        T = ia + 4 | 0;
                        ca = c[ga + (T + fa) >> 2] | 0;
                        if ((ca & 3 | 0) == 1) {
                            pa = ca & -8;
                            ea = ca >>> 3;
                            i:do if (ca >>> 0 >= 256) {
                                da = c[ga + ((fa | 24) + ia) >> 2] | 0;
                                aa = c[ga + (ia + 12 + fa) >> 2] | 0;
                                do if ((aa | 0) == (ja | 0)) {
                                    ba = fa | 16;
                                    X = ga + (T + ba) | 0;
                                    $ = c[X >> 2] | 0;
                                    if (!$) {
                                        Z = ga + (ba + ia) | 0;
                                        ba = c[Z >> 2] | 0;
                                        if (!ba) {
                                            Aa = 0;
                                            break
                                        } else {
                                            Ba = ba;
                                            Ca = Z
                                        }
                                    } else {
                                        Ba = $;
                                        Ca = X
                                    }
                                    while (1) {
                                        X = Ba + 20 | 0;
                                        $ = c[X >> 2] | 0;
                                        if ($) {
                                            Ba = $;
                                            Ca = X;
                                            continue
                                        }
                                        X = Ba + 16 | 0;
                                        $ = c[X >> 2] | 0;
                                        if (!$) {
                                            Da = Ba;
                                            Ea = Ca;
                                            break
                                        } else {
                                            Ba = $;
                                            Ca = X
                                        }
                                    }
                                    if (Ea >>> 0 < wa >>> 0)la(); else {
                                        c[Ea >> 2] = 0;
                                        Aa = Da;
                                        break
                                    }
                                } else {
                                    X = c[ga + ((fa | 8) + ia) >> 2] | 0;
                                    if (X >>> 0 < wa >>> 0)la();
                                    $ = X + 12 | 0;
                                    if ((c[$ >> 2] | 0) != (ja | 0))la();
                                    Z = aa + 8 | 0;
                                    if ((c[Z >> 2] | 0) == (ja | 0)) {
                                        c[$ >> 2] = aa;
                                        c[Z >> 2] = X;
                                        Aa = aa;
                                        break
                                    } else la()
                                } while (0);
                                if (!da)break;
                                aa = c[ga + (ia + 28 + fa) >> 2] | 0;
                                X = 476 + (aa << 2) | 0;
                                do if ((ja | 0) != (c[X >> 2] | 0)) {
                                    if (da >>> 0 < (c[47] | 0) >>> 0)la();
                                    Z = da + 16 | 0;
                                    if ((c[Z >> 2] | 0) == (ja | 0))c[Z >> 2] = Aa; else c[da + 20 >> 2] = Aa;
                                    if (!Aa)break i
                                } else {
                                    c[X >> 2] = Aa;
                                    if (Aa)break;
                                    c[44] = c[44] & ~(1 << aa);
                                    break i
                                } while (0);
                                aa = c[47] | 0;
                                if (Aa >>> 0 < aa >>> 0)la();
                                c[Aa + 24 >> 2] = da;
                                X = fa | 16;
                                Z = c[ga + (X + ia) >> 2] | 0;
                                do if (Z)if (Z >>> 0 < aa >>> 0)la(); else {
                                    c[Aa + 16 >> 2] = Z;
                                    c[Z + 24 >> 2] = Aa;
                                    break
                                } while (0);
                                Z = c[ga + (T + X) >> 2] | 0;
                                if (!Z)break;
                                if (Z >>> 0 < (c[47] | 0) >>> 0)la(); else {
                                    c[Aa + 20 >> 2] = Z;
                                    c[Z + 24 >> 2] = Aa;
                                    break
                                }
                            } else {
                                Z = c[ga + ((fa | 8) + ia) >> 2] | 0;
                                aa = c[ga + (ia + 12 + fa) >> 2] | 0;
                                da = 212 + (ea << 1 << 2) | 0;
                                do if ((Z | 0) != (da | 0)) {
                                    if (Z >>> 0 < wa >>> 0)la();
                                    if ((c[Z + 12 >> 2] | 0) == (ja | 0))break;
                                    la()
                                } while (0);
                                if ((aa | 0) == (Z | 0)) {
                                    c[43] = c[43] & ~(1 << ea);
                                    break
                                }
                                do if ((aa | 0) == (da | 0))Fa = aa + 8 | 0; else {
                                    if (aa >>> 0 < wa >>> 0)la();
                                    X = aa + 8 | 0;
                                    if ((c[X >> 2] | 0) == (ja | 0)) {
                                        Fa = X;
                                        break
                                    }
                                    la()
                                } while (0);
                                c[Z + 12 >> 2] = aa;
                                c[Fa >> 2] = Z
                            } while (0);
                            Ga = ga + ((pa | fa) + ia) | 0;
                            Ha = pa + ka | 0
                        } else {
                            Ga = ja;
                            Ha = ka
                        }
                        ea = Ga + 4 | 0;
                        c[ea >> 2] = c[ea >> 2] & -2;
                        c[ga + (S + 4) >> 2] = Ha | 1;
                        c[ga + (Ha + S) >> 2] = Ha;
                        ea = Ha >>> 3;
                        if (Ha >>> 0 < 256) {
                            T = ea << 1;
                            ca = 212 + (T << 2) | 0;
                            da = c[43] | 0;
                            X = 1 << ea;
                            do if (!(da & X)) {
                                c[43] = da | X;
                                Ia = 212 + (T + 2 << 2) | 0;
                                Ja = ca
                            } else {
                                ea = 212 + (T + 2 << 2) | 0;
                                $ = c[ea >> 2] | 0;
                                if ($ >>> 0 >= (c[47] | 0) >>> 0) {
                                    Ia = ea;
                                    Ja = $;
                                    break
                                }
                                la()
                            } while (0);
                            c[Ia >> 2] = oa;
                            c[Ja + 12 >> 2] = oa;
                            c[ga + (S + 8) >> 2] = Ja;
                            c[ga + (S + 12) >> 2] = ca;
                            break
                        }
                        T = Ha >>> 8;
                        do if (!T)La = 0; else {
                            if (Ha >>> 0 > 16777215) {
                                La = 31;
                                break
                            }
                            X = (T + 1048320 | 0) >>> 16 & 8;
                            da = T << X;
                            pa = (da + 520192 | 0) >>> 16 & 4;
                            $ = da << pa;
                            da = ($ + 245760 | 0) >>> 16 & 2;
                            ea = 14 - (pa | X | da) + ($ << da >>> 15) | 0;
                            La = Ha >>> (ea + 7 | 0) & 1 | ea << 1
                        } while (0);
                        T = 476 + (La << 2) | 0;
                        c[ga + (S + 28) >> 2] = La;
                        c[ga + (S + 20) >> 2] = 0;
                        c[ga + (S + 16) >> 2] = 0;
                        ca = c[44] | 0;
                        ea = 1 << La;
                        if (!(ca & ea)) {
                            c[44] = ca | ea;
                            c[T >> 2] = oa;
                            c[ga + (S + 24) >> 2] = T;
                            c[ga + (S + 12) >> 2] = oa;
                            c[ga + (S + 8) >> 2] = oa;
                            break
                        }
                        ea = c[T >> 2] | 0;
                        j:do if ((c[ea + 4 >> 2] & -8 | 0) != (Ha | 0)) {
                            T = Ha << ((La | 0) == 31 ? 0 : 25 - (La >>> 1) | 0);
                            ca = ea;
                            while (1) {
                                da = ca + 16 + (T >>> 31 << 2) | 0;
                                $ = c[da >> 2] | 0;
                                if (!$) {
                                    Ma = da;
                                    Na = ca;
                                    break
                                }
                                if ((c[$ + 4 >> 2] & -8 | 0) == (Ha | 0)) {
                                    Oa = $;
                                    break j
                                } else {
                                    T = T << 1;
                                    ca = $
                                }
                            }
                            if (Ma >>> 0 < (c[47] | 0) >>> 0)la(); else {
                                c[Ma >> 2] = oa;
                                c[ga + (S + 24) >> 2] = Na;
                                c[ga + (S + 12) >> 2] = oa;
                                c[ga + (S + 8) >> 2] = oa;
                                break h
                            }
                        } else Oa = ea; while (0);
                        ea = Oa + 8 | 0;
                        ca = c[ea >> 2] | 0;
                        T = c[47] | 0;
                        if (ca >>> 0 >= T >>> 0 & Oa >>> 0 >= T >>> 0) {
                            c[ca + 12 >> 2] = oa;
                            c[ea >> 2] = oa;
                            c[ga + (S + 8) >> 2] = ca;
                            c[ga + (S + 12) >> 2] = Oa;
                            c[ga + (S + 24) >> 2] = 0;
                            break
                        } else la()
                    } else {
                        ca = (c[46] | 0) + ka | 0;
                        c[46] = ca;
                        c[49] = oa;
                        c[ga + (S + 4) >> 2] = ca | 1
                    } while (0);
                    n = ga + (qa | 8) | 0;
                    return n | 0
                } else za = 620;
                while (1) {
                    S = c[za >> 2] | 0;
                    if (S >>> 0 <= ra >>> 0 ? (oa = c[za + 4 >> 2] | 0, ka = S + oa | 0, ka >>> 0 > ra >>> 0) : 0) {
                        Pa = S;
                        Qa = oa;
                        Ra = ka;
                        break
                    }
                    za = c[za + 8 >> 2] | 0
                }
                qa = Pa + (Qa + -39) | 0;
                ka = Pa + (Qa + -47 + ((qa & 7 | 0) == 0 ? 0 : 0 - qa & 7)) | 0;
                qa = ra + 16 | 0;
                oa = ka >>> 0 < qa >>> 0 ? ra : ka;
                ka = oa + 8 | 0;
                S = ga + 8 | 0;
                ja = (S & 7 | 0) == 0 ? 0 : 0 - S & 7;
                S = ia + -40 - ja | 0;
                c[49] = ga + ja;
                c[46] = S;
                c[ga + (ja + 4) >> 2] = S | 1;
                c[ga + (ia + -36) >> 2] = 40;
                c[50] = c[165];
                S = oa + 4 | 0;
                c[S >> 2] = 27;
                c[ka >> 2] = c[155];
                c[ka + 4 >> 2] = c[156];
                c[ka + 8 >> 2] = c[157];
                c[ka + 12 >> 2] = c[158];
                c[155] = ga;
                c[156] = ia;
                c[158] = 0;
                c[157] = ka;
                ka = oa + 28 | 0;
                c[ka >> 2] = 7;
                if ((oa + 32 | 0) >>> 0 < Ra >>> 0) {
                    ja = ka;
                    do {
                        ka = ja;
                        ja = ja + 4 | 0;
                        c[ja >> 2] = 7
                    } while ((ka + 8 | 0) >>> 0 < Ra >>> 0)
                }
                if ((oa | 0) != (ra | 0)) {
                    ja = oa - ra | 0;
                    c[S >> 2] = c[S >> 2] & -2;
                    c[ra + 4 >> 2] = ja | 1;
                    c[oa >> 2] = ja;
                    ka = ja >>> 3;
                    if (ja >>> 0 < 256) {
                        fa = ka << 1;
                        ca = 212 + (fa << 2) | 0;
                        ea = c[43] | 0;
                        T = 1 << ka;
                        if (ea & T) {
                            ka = 212 + (fa + 2 << 2) | 0;
                            Z = c[ka >> 2] | 0;
                            if (Z >>> 0 < (c[47] | 0) >>> 0)la(); else {
                                Sa = ka;
                                Ta = Z
                            }
                        } else {
                            c[43] = ea | T;
                            Sa = 212 + (fa + 2 << 2) | 0;
                            Ta = ca
                        }
                        c[Sa >> 2] = ra;
                        c[Ta + 12 >> 2] = ra;
                        c[ra + 8 >> 2] = Ta;
                        c[ra + 12 >> 2] = ca;
                        break
                    }
                    ca = ja >>> 8;
                    if (ca)if (ja >>> 0 > 16777215)Ua = 31; else {
                        fa = (ca + 1048320 | 0) >>> 16 & 8;
                        T = ca << fa;
                        ca = (T + 520192 | 0) >>> 16 & 4;
                        ea = T << ca;
                        T = (ea + 245760 | 0) >>> 16 & 2;
                        Z = 14 - (ca | fa | T) + (ea << T >>> 15) | 0;
                        Ua = ja >>> (Z + 7 | 0) & 1 | Z << 1
                    } else Ua = 0;
                    Z = 476 + (Ua << 2) | 0;
                    c[ra + 28 >> 2] = Ua;
                    c[ra + 20 >> 2] = 0;
                    c[qa >> 2] = 0;
                    T = c[44] | 0;
                    ea = 1 << Ua;
                    if (!(T & ea)) {
                        c[44] = T | ea;
                        c[Z >> 2] = ra;
                        c[ra + 24 >> 2] = Z;
                        c[ra + 12 >> 2] = ra;
                        c[ra + 8 >> 2] = ra;
                        break
                    }
                    ea = c[Z >> 2] | 0;
                    k:do if ((c[ea + 4 >> 2] & -8 | 0) != (ja | 0)) {
                        Z = ja << ((Ua | 0) == 31 ? 0 : 25 - (Ua >>> 1) | 0);
                        T = ea;
                        while (1) {
                            fa = T + 16 + (Z >>> 31 << 2) | 0;
                            ca = c[fa >> 2] | 0;
                            if (!ca) {
                                Va = fa;
                                Wa = T;
                                break
                            }
                            if ((c[ca + 4 >> 2] & -8 | 0) == (ja | 0)) {
                                Xa = ca;
                                break k
                            } else {
                                Z = Z << 1;
                                T = ca
                            }
                        }
                        if (Va >>> 0 < (c[47] | 0) >>> 0)la(); else {
                            c[Va >> 2] = ra;
                            c[ra + 24 >> 2] = Wa;
                            c[ra + 12 >> 2] = ra;
                            c[ra + 8 >> 2] = ra;
                            break g
                        }
                    } else Xa = ea; while (0);
                    ea = Xa + 8 | 0;
                    ja = c[ea >> 2] | 0;
                    qa = c[47] | 0;
                    if (ja >>> 0 >= qa >>> 0 & Xa >>> 0 >= qa >>> 0) {
                        c[ja + 12 >> 2] = ra;
                        c[ea >> 2] = ra;
                        c[ra + 8 >> 2] = ja;
                        c[ra + 12 >> 2] = Xa;
                        c[ra + 24 >> 2] = 0;
                        break
                    } else la()
                }
            } else {
                ja = c[47] | 0;
                if ((ja | 0) == 0 | ga >>> 0 < ja >>> 0)c[47] = ga;
                c[155] = ga;
                c[156] = ia;
                c[158] = 0;
                c[52] = c[161];
                c[51] = -1;
                ja = 0;
                do {
                    ea = ja << 1;
                    qa = 212 + (ea << 2) | 0;
                    c[212 + (ea + 3 << 2) >> 2] = qa;
                    c[212 + (ea + 2 << 2) >> 2] = qa;
                    ja = ja + 1 | 0
                } while ((ja | 0) != 32);
                ja = ga + 8 | 0;
                qa = (ja & 7 | 0) == 0 ? 0 : 0 - ja & 7;
                ja = ia + -40 - qa | 0;
                c[49] = ga + qa;
                c[46] = ja;
                c[ga + (qa + 4) >> 2] = ja | 1;
                c[ga + (ia + -36) >> 2] = 40;
                c[50] = c[165]
            } while (0);
            ia = c[46] | 0;
            if (ia >>> 0 > F >>> 0) {
                ga = ia - F | 0;
                c[46] = ga;
                ia = c[49] | 0;
                c[49] = ia + F;
                c[ia + (F + 4) >> 2] = ga | 1;
                c[ia + 4 >> 2] = F | 3;
                n = ia + 8 | 0;
                return n | 0
            }
        }
        c[(Ka() | 0) >> 2] = 12;
        n = 0;
        return n | 0
    }

    function Wa(a) {
        a = a | 0;
        var b = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, L = 0, M = 0;
        if (!a)return;
        b = a + -8 | 0;
        d = c[47] | 0;
        if (b >>> 0 < d >>> 0)la();
        e = c[a + -4 >> 2] | 0;
        f = e & 3;
        if ((f | 0) == 1)la();
        g = e & -8;
        h = a + (g + -8) | 0;
        do if (!(e & 1)) {
            i = c[b >> 2] | 0;
            if (!f)return;
            j = -8 - i | 0;
            k = a + j | 0;
            l = i + g | 0;
            if (k >>> 0 < d >>> 0)la();
            if ((k | 0) == (c[48] | 0)) {
                m = a + (g + -4) | 0;
                n = c[m >> 2] | 0;
                if ((n & 3 | 0) != 3) {
                    o = k;
                    p = l;
                    break
                }
                c[45] = l;
                c[m >> 2] = n & -2;
                c[a + (j + 4) >> 2] = l | 1;
                c[h >> 2] = l;
                return
            }
            n = i >>> 3;
            if (i >>> 0 < 256) {
                i = c[a + (j + 8) >> 2] | 0;
                m = c[a + (j + 12) >> 2] | 0;
                q = 212 + (n << 1 << 2) | 0;
                if ((i | 0) != (q | 0)) {
                    if (i >>> 0 < d >>> 0)la();
                    if ((c[i + 12 >> 2] | 0) != (k | 0))la()
                }
                if ((m | 0) == (i | 0)) {
                    c[43] = c[43] & ~(1 << n);
                    o = k;
                    p = l;
                    break
                }
                if ((m | 0) != (q | 0)) {
                    if (m >>> 0 < d >>> 0)la();
                    q = m + 8 | 0;
                    if ((c[q >> 2] | 0) == (k | 0))r = q; else la()
                } else r = m + 8 | 0;
                c[i + 12 >> 2] = m;
                c[r >> 2] = i;
                o = k;
                p = l;
                break
            }
            i = c[a + (j + 24) >> 2] | 0;
            m = c[a + (j + 12) >> 2] | 0;
            do if ((m | 0) == (k | 0)) {
                q = a + (j + 20) | 0;
                n = c[q >> 2] | 0;
                if (!n) {
                    s = a + (j + 16) | 0;
                    t = c[s >> 2] | 0;
                    if (!t) {
                        u = 0;
                        break
                    } else {
                        v = t;
                        w = s
                    }
                } else {
                    v = n;
                    w = q
                }
                while (1) {
                    q = v + 20 | 0;
                    n = c[q >> 2] | 0;
                    if (n) {
                        v = n;
                        w = q;
                        continue
                    }
                    q = v + 16 | 0;
                    n = c[q >> 2] | 0;
                    if (!n) {
                        x = v;
                        y = w;
                        break
                    } else {
                        v = n;
                        w = q
                    }
                }
                if (y >>> 0 < d >>> 0)la(); else {
                    c[y >> 2] = 0;
                    u = x;
                    break
                }
            } else {
                q = c[a + (j + 8) >> 2] | 0;
                if (q >>> 0 < d >>> 0)la();
                n = q + 12 | 0;
                if ((c[n >> 2] | 0) != (k | 0))la();
                s = m + 8 | 0;
                if ((c[s >> 2] | 0) == (k | 0)) {
                    c[n >> 2] = m;
                    c[s >> 2] = q;
                    u = m;
                    break
                } else la()
            } while (0);
            if (i) {
                m = c[a + (j + 28) >> 2] | 0;
                q = 476 + (m << 2) | 0;
                if ((k | 0) == (c[q >> 2] | 0)) {
                    c[q >> 2] = u;
                    if (!u) {
                        c[44] = c[44] & ~(1 << m);
                        o = k;
                        p = l;
                        break
                    }
                } else {
                    if (i >>> 0 < (c[47] | 0) >>> 0)la();
                    m = i + 16 | 0;
                    if ((c[m >> 2] | 0) == (k | 0))c[m >> 2] = u; else c[i + 20 >> 2] = u;
                    if (!u) {
                        o = k;
                        p = l;
                        break
                    }
                }
                m = c[47] | 0;
                if (u >>> 0 < m >>> 0)la();
                c[u + 24 >> 2] = i;
                q = c[a + (j + 16) >> 2] | 0;
                do if (q)if (q >>> 0 < m >>> 0)la(); else {
                    c[u + 16 >> 2] = q;
                    c[q + 24 >> 2] = u;
                    break
                } while (0);
                q = c[a + (j + 20) >> 2] | 0;
                if (q)if (q >>> 0 < (c[47] | 0) >>> 0)la(); else {
                    c[u + 20 >> 2] = q;
                    c[q + 24 >> 2] = u;
                    o = k;
                    p = l;
                    break
                } else {
                    o = k;
                    p = l
                }
            } else {
                o = k;
                p = l
            }
        } else {
            o = b;
            p = g
        } while (0);
        if (o >>> 0 >= h >>> 0)la();
        b = a + (g + -4) | 0;
        u = c[b >> 2] | 0;
        if (!(u & 1))la();
        if (!(u & 2)) {
            if ((h | 0) == (c[49] | 0)) {
                d = (c[46] | 0) + p | 0;
                c[46] = d;
                c[49] = o;
                c[o + 4 >> 2] = d | 1;
                if ((o | 0) != (c[48] | 0))return;
                c[48] = 0;
                c[45] = 0;
                return
            }
            if ((h | 0) == (c[48] | 0)) {
                d = (c[45] | 0) + p | 0;
                c[45] = d;
                c[48] = o;
                c[o + 4 >> 2] = d | 1;
                c[o + d >> 2] = d;
                return
            }
            d = (u & -8) + p | 0;
            x = u >>> 3;
            do if (u >>> 0 >= 256) {
                y = c[a + (g + 16) >> 2] | 0;
                w = c[a + (g | 4) >> 2] | 0;
                do if ((w | 0) == (h | 0)) {
                    v = a + (g + 12) | 0;
                    r = c[v >> 2] | 0;
                    if (!r) {
                        f = a + (g + 8) | 0;
                        e = c[f >> 2] | 0;
                        if (!e) {
                            z = 0;
                            break
                        } else {
                            A = e;
                            B = f
                        }
                    } else {
                        A = r;
                        B = v
                    }
                    while (1) {
                        v = A + 20 | 0;
                        r = c[v >> 2] | 0;
                        if (r) {
                            A = r;
                            B = v;
                            continue
                        }
                        v = A + 16 | 0;
                        r = c[v >> 2] | 0;
                        if (!r) {
                            C = A;
                            D = B;
                            break
                        } else {
                            A = r;
                            B = v
                        }
                    }
                    if (D >>> 0 < (c[47] | 0) >>> 0)la(); else {
                        c[D >> 2] = 0;
                        z = C;
                        break
                    }
                } else {
                    v = c[a + g >> 2] | 0;
                    if (v >>> 0 < (c[47] | 0) >>> 0)la();
                    r = v + 12 | 0;
                    if ((c[r >> 2] | 0) != (h | 0))la();
                    f = w + 8 | 0;
                    if ((c[f >> 2] | 0) == (h | 0)) {
                        c[r >> 2] = w;
                        c[f >> 2] = v;
                        z = w;
                        break
                    } else la()
                } while (0);
                if (y) {
                    w = c[a + (g + 20) >> 2] | 0;
                    l = 476 + (w << 2) | 0;
                    if ((h | 0) == (c[l >> 2] | 0)) {
                        c[l >> 2] = z;
                        if (!z) {
                            c[44] = c[44] & ~(1 << w);
                            break
                        }
                    } else {
                        if (y >>> 0 < (c[47] | 0) >>> 0)la();
                        w = y + 16 | 0;
                        if ((c[w >> 2] | 0) == (h | 0))c[w >> 2] = z; else c[y + 20 >> 2] = z;
                        if (!z)break
                    }
                    w = c[47] | 0;
                    if (z >>> 0 < w >>> 0)la();
                    c[z + 24 >> 2] = y;
                    l = c[a + (g + 8) >> 2] | 0;
                    do if (l)if (l >>> 0 < w >>> 0)la(); else {
                        c[z + 16 >> 2] = l;
                        c[l + 24 >> 2] = z;
                        break
                    } while (0);
                    l = c[a + (g + 12) >> 2] | 0;
                    if (l)if (l >>> 0 < (c[47] | 0) >>> 0)la(); else {
                        c[z + 20 >> 2] = l;
                        c[l + 24 >> 2] = z;
                        break
                    }
                }
            } else {
                l = c[a + g >> 2] | 0;
                w = c[a + (g | 4) >> 2] | 0;
                y = 212 + (x << 1 << 2) | 0;
                if ((l | 0) != (y | 0)) {
                    if (l >>> 0 < (c[47] | 0) >>> 0)la();
                    if ((c[l + 12 >> 2] | 0) != (h | 0))la()
                }
                if ((w | 0) == (l | 0)) {
                    c[43] = c[43] & ~(1 << x);
                    break
                }
                if ((w | 0) != (y | 0)) {
                    if (w >>> 0 < (c[47] | 0) >>> 0)la();
                    y = w + 8 | 0;
                    if ((c[y >> 2] | 0) == (h | 0))E = y; else la()
                } else E = w + 8 | 0;
                c[l + 12 >> 2] = w;
                c[E >> 2] = l
            } while (0);
            c[o + 4 >> 2] = d | 1;
            c[o + d >> 2] = d;
            if ((o | 0) == (c[48] | 0)) {
                c[45] = d;
                return
            } else F = d
        } else {
            c[b >> 2] = u & -2;
            c[o + 4 >> 2] = p | 1;
            c[o + p >> 2] = p;
            F = p
        }
        p = F >>> 3;
        if (F >>> 0 < 256) {
            u = p << 1;
            b = 212 + (u << 2) | 0;
            d = c[43] | 0;
            E = 1 << p;
            if (d & E) {
                p = 212 + (u + 2 << 2) | 0;
                h = c[p >> 2] | 0;
                if (h >>> 0 < (c[47] | 0) >>> 0)la(); else {
                    G = p;
                    H = h
                }
            } else {
                c[43] = d | E;
                G = 212 + (u + 2 << 2) | 0;
                H = b
            }
            c[G >> 2] = o;
            c[H + 12 >> 2] = o;
            c[o + 8 >> 2] = H;
            c[o + 12 >> 2] = b;
            return
        }
        b = F >>> 8;
        if (b)if (F >>> 0 > 16777215)I = 31; else {
            H = (b + 1048320 | 0) >>> 16 & 8;
            G = b << H;
            b = (G + 520192 | 0) >>> 16 & 4;
            u = G << b;
            G = (u + 245760 | 0) >>> 16 & 2;
            E = 14 - (b | H | G) + (u << G >>> 15) | 0;
            I = F >>> (E + 7 | 0) & 1 | E << 1
        } else I = 0;
        E = 476 + (I << 2) | 0;
        c[o + 28 >> 2] = I;
        c[o + 20 >> 2] = 0;
        c[o + 16 >> 2] = 0;
        G = c[44] | 0;
        u = 1 << I;
        a:do if (G & u) {
            H = c[E >> 2] | 0;
            b:do if ((c[H + 4 >> 2] & -8 | 0) != (F | 0)) {
                b = F << ((I | 0) == 31 ? 0 : 25 - (I >>> 1) | 0);
                d = H;
                while (1) {
                    h = d + 16 + (b >>> 31 << 2) | 0;
                    p = c[h >> 2] | 0;
                    if (!p) {
                        J = h;
                        K = d;
                        break
                    }
                    if ((c[p + 4 >> 2] & -8 | 0) == (F | 0)) {
                        L = p;
                        break b
                    } else {
                        b = b << 1;
                        d = p
                    }
                }
                if (J >>> 0 < (c[47] | 0) >>> 0)la(); else {
                    c[J >> 2] = o;
                    c[o + 24 >> 2] = K;
                    c[o + 12 >> 2] = o;
                    c[o + 8 >> 2] = o;
                    break a
                }
            } else L = H; while (0);
            H = L + 8 | 0;
            d = c[H >> 2] | 0;
            b = c[47] | 0;
            if (d >>> 0 >= b >>> 0 & L >>> 0 >= b >>> 0) {
                c[d + 12 >> 2] = o;
                c[H >> 2] = o;
                c[o + 8 >> 2] = d;
                c[o + 12 >> 2] = L;
                c[o + 24 >> 2] = 0;
                break
            } else la()
        } else {
            c[44] = G | u;
            c[E >> 2] = o;
            c[o + 24 >> 2] = E;
            c[o + 12 >> 2] = o;
            c[o + 8 >> 2] = o
        } while (0);
        o = (c[51] | 0) + -1 | 0;
        c[51] = o;
        if (!o)M = 628; else return;
        while (1) {
            o = c[M >> 2] | 0;
            if (!o)break; else M = o + 8 | 0
        }
        c[51] = -1;
        return
    }

    function Xa() {
    }

    function Ya(b, d, e) {
        b = b | 0;
        d = d | 0;
        e = e | 0;
        var f = 0, g = 0, h = 0, i = 0;
        f = b + e | 0;
        if ((e | 0) >= 20) {
            d = d & 255;
            g = b & 3;
            h = d | d << 8 | d << 16 | d << 24;
            i = f & ~3;
            if (g) {
                g = b + 4 - g | 0;
                while ((b | 0) < (g | 0)) {
                    a[b >> 0] = d;
                    b = b + 1 | 0
                }
            }
            while ((b | 0) < (i | 0)) {
                c[b >> 2] = h;
                b = b + 4 | 0
            }
        }
        while ((b | 0) < (f | 0)) {
            a[b >> 0] = d;
            b = b + 1 | 0
        }
        return b - e | 0
    }

    function Za(b, d, e) {
        b = b | 0;
        d = d | 0;
        e = e | 0;
        var f = 0;
        if ((e | 0) >= 4096)return pa(b | 0, d | 0, e | 0) | 0;
        f = b | 0;
        if ((b & 3) == (d & 3)) {
            while (b & 3) {
                if (!e)return f | 0;
                a[b >> 0] = a[d >> 0] | 0;
                b = b + 1 | 0;
                d = d + 1 | 0;
                e = e - 1 | 0
            }
            while ((e | 0) >= 4) {
                c[b >> 2] = c[d >> 2];
                b = b + 4 | 0;
                d = d + 4 | 0;
                e = e - 4 | 0
            }
        }
        while ((e | 0) > 0) {
            a[b >> 0] = a[d >> 0] | 0;
            b = b + 1 | 0;
            d = d + 1 | 0;
            e = e - 1 | 0
        }
        return f | 0
    }

    function _a(a, b) {
        a = a | 0;
        b = b | 0;
        return xa[a & 1](b | 0) | 0
    }

    function $a(a, b, c, d) {
        a = a | 0;
        b = b | 0;
        c = c | 0;
        d = d | 0;
        return ya[a & 3](b | 0, c | 0, d | 0) | 0
    }

    function ab(a, b) {
        a = a | 0;
        b = b | 0;
        za[a & 1](b | 0)
    }

    function bb(a) {
        a = a | 0;
        aa(0);
        return 0
    }

    function cb(a, b, c) {
        a = a | 0;
        b = b | 0;
        c = c | 0;
        aa(1);
        return 0
    }

    function db(a) {
        a = a | 0;
        aa(2)
    }

// EMSCRIPTEN_END_FUNCS
    var xa = [bb, Pa];
    var ya = [cb, Sa, Qa, Ra];
    var za = [db, Ua];
    return {
        _fflush: Ma,
        _match: Ja,
        _memset: Ya,
        _malloc: Va,
        _memcpy: Za,
        _free: Wa,
        ___errno_location: Ka,
        runPostSets: Xa,
        stackAlloc: Aa,
        stackSave: Ba,
        stackRestore: Ca,
        establishStackSpace: Da,
        setThrew: Ea,
        setTempRet0: Ha,
        getTempRet0: Ia,
        dynCall_ii: _a,
        dynCall_iiii: $a,
        dynCall_vi: ab
    }
})


// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var _free = Module["_free"] = asm["_free"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var _match = Module["_match"] = asm["_match"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _fflush = Module["_fflush"] = asm["_fflush"];
var ___errno_location = Module["___errno_location"] = asm["___errno_location"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
Runtime.stackAlloc = asm["stackAlloc"];
Runtime.stackSave = asm["stackSave"];
Runtime.stackRestore = asm["stackRestore"];
Runtime.establishStackSpace = asm["establishStackSpace"];
Runtime.setTempRet0 = asm["setTempRet0"];
Runtime.getTempRet0 = asm["getTempRet0"];
function ExitStatus(status) {
    this.name = "ExitStatus";
    this.message = "Program terminated with exit(" + status + ")";
    this.status = status
}
ExitStatus.prototype = new Error;
ExitStatus.prototype.constructor = ExitStatus;
var initialStackTop;
var preloadStartTime = null;
var calledMain = false;
dependenciesFulfilled = function runCaller() {
    if (!Module["calledRun"])run();
    if (!Module["calledRun"])dependenciesFulfilled = runCaller
};
Module["callMain"] = Module.callMain = function callMain(args) {
    assert(runDependencies == 0, "cannot call main when async dependencies remain! (listen on __ATMAIN__)");
    assert(__ATPRERUN__.length == 0, "cannot call main when preRun functions remain to be called");
    args = args || [];
    ensureInitRuntime();
    var argc = args.length + 1;

    function pad() {
        for (var i = 0; i < 4 - 1; i++) {
            argv.push(0)
        }
    }

    var argv = [allocate(intArrayFromString(Module["thisProgram"]), "i8", ALLOC_NORMAL)];
    pad();
    for (var i = 0; i < argc - 1; i = i + 1) {
        argv.push(allocate(intArrayFromString(args[i]), "i8", ALLOC_NORMAL));
        pad()
    }
    argv.push(0);
    argv = allocate(argv, "i32", ALLOC_NORMAL);
    try {
        var ret = Module["_main"](argc, argv, 0);
        exit(ret, true)
    } catch (e) {
        if (e instanceof ExitStatus) {
            return
        } else if (e == "SimulateInfiniteLoop") {
            Module["noExitRuntime"] = true;
            return
        } else {
            if (e && typeof e === "object" && e.stack)Module.printErr("exception thrown: " + [e, e.stack]);
            throw e
        }
    } finally {
        calledMain = true
    }
};
function run(args) {
    args = args || Module["arguments"];
    if (preloadStartTime === null)preloadStartTime = Date.now();
    if (runDependencies > 0) {
        return
    }
    preRun();
    if (runDependencies > 0)return;
    if (Module["calledRun"])return;
    function doRun() {
        if (Module["calledRun"])return;
        Module["calledRun"] = true;
        if (ABORT)return;
        ensureInitRuntime();
        preMain();
        if (Module["onRuntimeInitialized"])Module["onRuntimeInitialized"]();
        if (Module["_main"] && shouldRunNow)Module["callMain"](args);
        postRun()
    }

    if (Module["setStatus"]) {
        Module["setStatus"]("Running...");
        setTimeout((function () {
            setTimeout((function () {
                Module["setStatus"]("")
            }), 1);
            doRun()
        }), 1)
    } else {
        doRun()
    }
}
Module["run"] = Module.run = run;
function exit(status, implicit) {
    if (implicit && Module["noExitRuntime"]) {
        return
    }
    if (Module["noExitRuntime"]) {
    } else {
        ABORT = true;
        EXITSTATUS = status;
        STACKTOP = initialStackTop;
        exitRuntime();
        if (Module["onExit"])Module["onExit"](status)
    }
    if (ENVIRONMENT_IS_NODE) {
        process["stdout"]["once"]("drain", (function () {
            process["exit"](status)
        }));
        console.log(" ");
        setTimeout((function () {
            process["exit"](status)
        }), 500)
    } else if (ENVIRONMENT_IS_SHELL && typeof quit === "function") {
        quit(status)
    }
    throw new ExitStatus(status)
}
Module["exit"] = Module.exit = exit;
var abortDecorators = [];
function abort(what) {
    if (what !== undefined) {
        Module.print(what);
        Module.printErr(what);
        what = JSON.stringify(what)
    } else {
        what = ""
    }
    ABORT = true;
    EXITSTATUS = 1;
    var extra = "\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.";
    var output = "abort(" + what + ") at " + stackTrace() + extra;
    if (abortDecorators) {
        abortDecorators.forEach((function (decorator) {
            output = decorator(output, what)
        }))
    }
    throw output
}
Module["abort"] = Module.abort = abort;
if (Module["preInit"]) {
    if (typeof Module["preInit"] == "function")Module["preInit"] = [Module["preInit"]];
    while (Module["preInit"].length > 0) {
        Module["preInit"].pop()()
    }
}
var shouldRunNow = true;
if (Module["noInitialRun"]) {
    shouldRunNow = false
}
run()




