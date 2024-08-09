const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { default: inquirer } = require('inquirer');

class GitHubModuleManager {
  constructor(owner, repo, branch = 'main', localModulesPath) {
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
    this.apiBaseUrl = 'https://api.github.com';
    this.rawContentBaseUrl = 'https://raw.githubusercontent.com';
    this.localModulesPath = localModulesPath;
  }

  async listGitHubModules() {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/repos/${this.owner}/${this.repo}/contents?ref=${this.branch}`);

      return response.data
        .filter(item => item.type === 'dir' && item.name.startsWith('module_'))
        .map(item => item.name);
    } catch (error) {
      console.error('Error al obtener la lista de módulos de GitHub:', error.message);
      return [];
    }
  }

  async listLocalModules() {
    try {
      const files = await fs.readdir(this.localModulesPath);
      return files.filter(file => file.startsWith('module_'));
    } catch (error) {
      console.error('Error al leer los módulos locales:', error.message);
      return [];
    }
  }

  async checkModules() {
    const githubModules = await this.listGitHubModules();
    const localModules = await this.listLocalModules();

    const downloadedModules = githubModules.filter(module => localModules.includes(module));
    const notDownloadedModules = githubModules.filter(module => !localModules.includes(module));

    console.log('Módulos descargados:');
    downloadedModules.forEach(module => console.log(`- ${module}`));

    console.log('\nMódulos no descargados:');
    notDownloadedModules.forEach(module => console.log(`- ${module}`));

    return { downloadedModules, notDownloadedModules };
  }

  async downloadModule(moduleName) {
    try {
      const moduleUrl = `${this.rawContentBaseUrl}/${this.owner}/${this.repo}/${this.branch}/${moduleName}/index.js`;
      const response = await axios.get(moduleUrl);

      const modulePath = path.join(this.localModulesPath, moduleName);
      await fs.mkdir(modulePath, { recursive: true });
      await fs.writeFile(path.join(modulePath, 'index.js'), response.data);

      console.log(`Módulo ${moduleName} descargado exitosamente`);
      return true;
    } catch (error) {
      console.error(`Error al descargar el módulo ${moduleName}:`, error.message);
      return false;
    }
  }

  async interactiveDownload() {
    const { notDownloadedModules } = await this.checkModules();

    if (notDownloadedModules.length === 0) {
      console.log('Todos los módulos ya están descargados.');
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'modulesToDownload',
        message: 'Selecciona los módulos que deseas descargar:',
        choices: notDownloadedModules
      }
    ]);

    for (const module of answers.modulesToDownload) {
      await this.downloadModule(module);
    }

    console.log('Proceso de descarga completado.');
  }

  async executeModule(moduleName) {
    const modulePath = path.join(this.localModulesPath, moduleName, 'index.js');
    try {
      // Verificar si el módulo existe
      await fs.access(modulePath);

      // Cargar dinámicamente el módulo
      const ModuleClass = require(modulePath);
      const moduleInstance = new ModuleClass();

      // Ejecutar el método run del módulo
      console.log(`Ejecutando ${moduleName}:`);
      moduleInstance.run();
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.error(`El módulo ${moduleName} no está descargado. Por favor, descárgalo primero.`);
      } else {
        console.error(`Error al ejecutar el módulo ${moduleName}:`, error.message);
      }
    }
  }

  async interactiveExecute() {
    const localModules = await this.listLocalModules();

    if (localModules.length === 0) {
      console.log('No hay módulos descargados para ejecutar. Por favor, descarga algunos módulos primero.');
      return;
    }

    const { moduleToExecute } = await inquirer.prompt([
      {
        type: 'list',
        name: 'moduleToExecute',
        message: 'Selecciona el módulo que deseas ejecutar:',
        choices: localModules
      }
    ]);

    await this.executeModule(moduleToExecute);
  }

  async getModuleContent(moduleName) {
    const url = `${this.rawContentBaseUrl}/${this.owner}/${this.repo}/${this.branch}/${moduleName}/index.js`;
    const response = await axios.get(url);
    return response.data;
  }

  async checkModuleUpdate(moduleName) {
    try {
      const localPath = path.join(this.localModulesPath, moduleName, 'index.js');
      const [localContent, remoteContent] = await Promise.all([
        fs.readFile(localPath, 'utf8'),
        this.getModuleContent(moduleName)
      ]);

      return localContent !== remoteContent;
    } catch (error) {
      console.error(`Error al verificar actualizaciones para ${moduleName}:`, error.message);
      return false;
    }
  }

  async updateModule(moduleName) {
    try {
      const remoteContent = await this.getModuleContent(moduleName);
      const localPath = path.join(this.localModulesPath, moduleName, 'index.js');
      await fs.writeFile(localPath, remoteContent);
      console.log(`Módulo ${moduleName} actualizado exitosamente.`);
      return true;
    } catch (error) {
      console.error(`Error al actualizar el módulo ${moduleName}:`, error.message);
      return false;
    }
  }

  async checkAllModulesForUpdates() {
    const localModules = await this.listLocalModules();
    const updatableModules = [];

    for (const module of localModules) {
      const hasUpdate = await this.checkModuleUpdate(module);
      if (hasUpdate) {
        updatableModules.push(module);
      }
    }

    return updatableModules;
  }

  async interactiveUpdate() {
    const updatableModules = await this.checkAllModulesForUpdates();

    if (updatableModules.length === 0) {
      console.log('Todos los módulos están actualizados.');
      return;
    }

    console.log('Módulos con actualizaciones disponibles:');
    updatableModules.forEach(module => console.log(`- ${module}`));

    const { modulesToUpdate } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'modulesToUpdate',
        message: 'Selecciona los módulos que deseas actualizar:',
        choices: updatableModules
      }
    ]);

    for (const module of modulesToUpdate) {
      await this.updateModule(module);
    }

    console.log('Proceso de actualización completado.');
  }
}

module.exports = { GitHubModuleManager };
