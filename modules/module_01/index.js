class Module {
  moduleName = 'module_01';

  constructor() {}

  run() {
    console.log(this.moduleName);
    console.log(`Estas ejecutando el ${this.moduleName}!`);
  }
}

module.exports = Module;
