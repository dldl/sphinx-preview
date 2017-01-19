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
    if (this.isActiveFileRst()) {
      this.startSphinxServer((err) => {
        if (err) {
          atom.notifications.addError(err.message);
          return;
        }
        this.openBrowser();
      });
    } else {
      atom.notifications.addWarning('Active file must have reStructuredText extension (.rst)');
    }
  },

  getBindingPath() {
    return `/${atom.project.getPaths()[0].replace(/[/\\*]/g, '/').replace(':', '')}`; // WINDOWS
  },

  startSphinxServer(onStart) {
    const docker = new Docker({ host: 'http://localhost', port: 2375 });

    const containerName = 'sphinx-preview';

    docker.listContainers({ all: true }, (err, containers) => {
      if (err) {
        onStart(err);
        return;
      }
      for (const container of containers) {
        if (container.Names.includes(`/${containerName}`)) {
          if (container.State !== 'running') {
            // Restart Container
            atom.notifications.addInfo('Starting exited container');
            const containerObj = docker.getContainer(container.Id);
            containerObj.start((errStart) => {
              if (errStart) {
                onStart(errStart);
                return;
              }
              atom.notifications.addSuccess('Container started');
              onStart();
            });
          } else {
            atom.notifications.addWarning('Container is already running');
            onStart();
          }
          return;
        }
      }

      const opts = {
        Image: 'dldl/sphinx-server',
        name: containerName,
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

      atom.notifications.addInfo('Container is starting');
      docker.createContainer(opts, (errCreate, container) => {
        if (errCreate) {
          onStart(errCreate);
          return;
        }
        container.start((errStart) => {
          if (errStart) {
            onStart(errStart);
            return;
          }
          atom.notifications.addSuccess('Container started');
          onStart();
        });
      });
    });
  },

  isActiveFileRst() {
    const editor = atom.workspace.getActivePaneItem();
    if (!editor || !editor.buffer) return false;
    const activeFilePath = editor.buffer.file.path;
    if (!activeFilePath.includes('.')) return false;

    const ext = activeFilePath.slice(activeFilePath.lastIndexOf('.') + 1);
    return ext === 'rst';
  },

  openBrowser() {
    const editor = atom.workspace.getActivePaneItem();
    const activeFilePath = editor != null ? editor.buffer.file.path : null;

    if (!activeFilePath) return;

    const projectPath = atom.project.getPaths()[0];
    const relativePath = activeFilePath.replace(projectPath, '');
    const url = relativePath.replace('rst', 'html').replace(/[/\\*]/g, '/');
    atom.workspace.open(`http://localhost:8000${url}`, { searchAllPanes: true, split: 'right' });
  },

};
