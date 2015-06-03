export class SC {
  constructor(value) {
    this._value = value;
  }

  value() {
    return this._value;
  }
}

export function peel(value) {
  return value instanceof SC ? value.value() : value;
}

export function flop(array) {
  if (array.length === 0) {
    return [ [] ];
  }

  let maxSize = array.reduce((len, sublist) => {
    return Math.max(len, Array.isArray(sublist) ? sublist.length : 1);
  }, 0);
  let result = new Array(maxSize);
  let len = array.length;

  for (let i = 0; i < maxSize; i++) {
    let sublist = result[i] = new Array(len);
    for (let j = 0; j < len; j++) {
      let value = array[j];
      sublist[j] = Array.isArray(value) ? value[i % value.length] : value;
    }
  }

  return result;
}

export function defineMethod(target, name, func) {
  Object.defineProperty(target.prototype, name, {
    value: func,
    enumerable: false,
    configurable: true,
    writable: true,
  });
}

export function sc(value) {
  return new SC(value);
}

export function valueOf(name, func, that, args, expandToArray) {
  let hasArray = args.some(Array.isArray);

  if (hasArray) {
    args = flop(args);

    if (expandToArray && Array.isArray(that)) {
      let result = new Array(Math.max(that.length, args.length));
      for (let i = 0; i < result.length; i++) {
        result[i] = valueOf(name, func, that[i % that.length], args[i % args.length], true);
      }
      return result;
    }

    return args.map(args => valueOf(name, func, that, args, true));
  }

  args = args.map(peel);

  if (expandToArray && Array.isArray(that)) {
    return that.map(value => func.apply(null, [ value ].concat(args)));
  }

  return func.apply(null, [ that ].concat(args));
}

export function addFunction(name, func, opts = {}) {
  if (sc.hasOwnProperty(name) && !opts.override) {
    return;
  }

  let expandToArray = !!opts.expandToArray;

  sc[name] = function(value) {
    let args = Array.prototype.slice.call(arguments, 1);
    return valueOf(name, func, value, args, expandToArray);
  };

  defineMethod(SC, name, function() {
    let args = Array.prototype.slice.call(arguments, 0, func.length);
    return new SC(valueOf(func, name, this.value(), args, expandToArray));
  });
}

export function removeFunction(name) {
  delete sc[name];
  delete SC.prototype[name];
}

export function mixin(source = {}, opts = {}) {
  Object.keys(source).forEach((name) => {
    if (typeof source[name] === "function") {
      addFunction(name, source[name], opts);
    }
  });
  return sc;
}

sc.addFunction = addFunction;
sc.removeFunction = removeFunction;
sc.mixin = mixin;

export default sc;
