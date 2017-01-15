'use babel';

import { CompositeDisposable } from 'atom';
import Docker from 'dockerode';

export default {

  subscriptions: null,

  activate(state) {
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'sphinx-preview:toggle': () => this.toggle(),
    }));
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  toggle() {
    console.log('SphinxPreview was toggled!');
    this.startSphinxServer();
    setTimeout(() => {
      this.openBrowser();
    }, 2000);
  },

  getBindingPath() {
    return `/${atom.project.getPaths()[0].replace(/[/\\*]/g, '/').replace(':', '')}`; // WINDOWS
  },

  startSphinxServer() {
    const docker = new Docker({ host: 'http://localhost', port: 2375 });
    const opts = {
      HostConfig: {
        Binds: [`${this.getBindingPath()}:/web`],
        PortBindings: {
          '8000/tcp': [{
            HostPort: '8000',
          }],
          '35729/tcp': [{
            HostPort: '35729',
          }],
        },
      },
    };
    docker.run('dldl/sphinx-server', [], process.stdout, opts, (err, data, container) => {
      console.log(err);
    });
  },

  openBrowser() {
    const editor = atom.workspace.getActivePaneItem();
    const activeFilePath = editor != null ? editor.buffer.file.path : null;

    if (!activeFilePath) return;

    const projectPath = atom.project.getPaths()[0];
    const relativePath = activeFilePath.replace(projectPath, '');
    const url = relativePath.replace('rst', 'html').replace(/[/\\*]/g, '/');
    atom.workspace.open(`http://localhost:8000${url}`);
  },

};
