const { GitHubModuleManager } = require('./moduleChecker');
const path = require('path');
const { default: inquirer } = require('inquirer');

async function main() {
  const localModulesPath = path.join(__dirname, 'modules');
  const manager = new GitHubModuleManager('vcgtz', 'puppeteer-modules', 'main', localModulesPath);

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '¿Qué acción deseas realizar?',
      choices: [
        'Descargar módulos interactivamente',
        'Descargar un módulo específico',
        'Verificar módulos',
        'Ejecutar un módulo',
        'Actualizar módulos',
        'Salir'
      ]
    }
  ]);

  switch (action) {
    case 'Descargar módulos interactivamente':
      await manager.interactiveDownload();
      break;
    case 'Descargar un módulo específico':
      const { moduleName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'moduleName',
          message: 'Ingresa el nombre del módulo que deseas descargar (ejemplo: module_01):',
          validate: input => input.startsWith('module_') ? true : 'El nombre del módulo debe comenzar con "module_"'
        }
      ]);
      await manager.downloadModule(moduleName);
      break;
    case 'Verificar módulos':
      await manager.checkModules();
      break;
    case 'Ejecutar un módulo':
      await manager.interactiveExecute();
      break;
    case 'Actualizar módulos':
      await manager.interactiveUpdate();
      break;
    case 'Salir':
      console.log('¡Hasta luego!');
      process.exit(0);
  }
}

main().catch(console.error);
