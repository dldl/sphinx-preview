'use babel';

import { CompositeDisposable } from 'atom';
import Docker from 'dockerode';

const os = require('os');

export default {

  subscriptions: null,

  activate() {
    require('atom-package-deps').install('sphinx-preview')
      .then(() => {
        this.subscriptions = new CompositeDisposable();
        this.subscriptions.add(atom.commands.add('atom-workspace', {
          'sphinx-preview:toggle': () => this.toggle(),
        }));
      });
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
    // == DARWIN DOCKER FIX [1/2] === -- BEGIN --
    // Lines below were changed in order to fix filesystem-related issues
    // preventing python-livereload's file watcher from running correctly 
    // when docker host is macOS (darwin) Mojave

    var path = `${atom.project.getPaths()[0].replace(/[/\\*]/g, '/').replace(':', '')}`;

    if(os.platform() === 'win32') {
      path = `/${path}`;
    }

    return path;

    // == DARWIN DOCKER FIX [1/2] === -- END --
  },

  startSphinxServer(onStart) {
    let docker;
    if (process.platform === 'win32') {
      docker = new Docker({ host: 'http://localhost', port: 2375 });
    } else {
      docker = new Docker({ socketPath: '/var/run/docker.sock' });
    }

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
          },

        // == DARWIN DOCKER FIX [2/2] === -- BEGIN --
        // Lines below were added in order to fix filesystem-related issues
        // preventing python-livereload's file watcher from running correctly 
        // when docker host is macOS (darwin) Mojave
          
          Devices: [ ],
          BlkioWeightDevice: [ ],

          Dns: [ ],
          DnsOptions: [ ],
          DnsSearch: [ ],

          RestartPolicy: {
            Name: "no",
            MaximumRetryCount: 0,
          }
        },

        Tty: true,
        OpenStdin: true,

        // == DARWIN DOCKER FIX [2/2] === -- END --
      };

      atom.notifications.addInfo('Pulling last version of Sphinx-Server (this may take a while)');
      docker.pull('dldl/sphinx-server:latest', (errPull) => {
        if (errPull) {
          onStart(errPull);
          return;
        }
        atom.notifications.addInfo('Creating and starting container');
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
    const urlSuffix = relativePath.replace('rst', 'html').replace(/[/\\*]/g, '/');
    const fullUrl = `http://127.0.0.1:8000${urlSuffix}`;

    const viewer = atom.workspace.paneForURI(fullUrl);
    if (!viewer) {
      const prevActivePane = atom.workspace.getActivePane();
      atom.workspace.open(fullUrl, { searchAllPanes: true, split: 'right' }).then(() => {
        prevActivePane.activate();
      });
    } else {
      viewer.destroyItem(viewer.itemForURI(fullUrl));
    }
  },

};
