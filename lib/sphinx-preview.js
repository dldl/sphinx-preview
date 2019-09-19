'use babel';

import { CompositeDisposable } from 'atom';
import Docker from 'dockerode';
import Crypto from 'crypto';
import FP from 'find-free-port';
import * as os from 'os';

export default {

  subscriptions: null,
  servers: {},
  // mapping between container paths and ports
  containerPorts: {},
  imageTag: 'dldl/sphinx-server:latest',
  labelPrefix: 'fr.dldl.sphinx-server',

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
      atom.notifications.addWarning('Active file must have reStructuredText extension (.rst) and must be opened as part of a Project Folder');
    }
  },

  getCurrProjectPath() {
    const editor = atom.workspace.getActivePaneItem();
    const activeFilePath = editor.buffer.file.path;

    if (!activeFilePath) return null;

    for (const path of atom.project.getPaths()) {
      if (activeFilePath.startsWith(path)) {
        return path;
      }
    }
    return null;
  },

  getContainerIdx(serverPath) {
    if (!(serverPath in this.servers)) {
      this.servers[serverPath] = this.idxs;
      this.idxs += 1;
    }

    return this.servers[serverPath];
  },

  getContainerName(serverPath) {
    var hash =  Crypto.createHash('sha256');
    var subName = hash.update(serverPath).digest('hex');
    var subName = subName.substring(0, 12);

    return 'sphinx-preview-' + subName;
  },

  createContainerPort(success) {
      FP(30000, (err, freePort) => {
        return success(freePort)
      })
  },

  getContainerPort(serverPath) {
     return this.containerPorts[serverPath];
  },

  getBindingPath(projectPath) {
    // == DARWIN DOCKER FIX [1/2] === -- BEGIN --
    // Lines below were changed in order to fix filesystem-related issues
    // preventing python-livereload's file watcher from running correctly
    // when docker host is macOS (darwin) Mojave

    let path =  `${projectPath.replace(/[/\\*]/g, '/').replace(':', '')}`;

    if (os.platform() === 'win32') {
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

    const projectPath = this.getCurrProjectPath();
    const containerIdx = this.getContainerIdx(projectPath);
    const containerName = this.getContainerName(projectPath);

    docker.listContainers({
      all: true,
      filters: {
        label: [`${this.labelPrefix}.path=${projectPath}`]
      },
    }, (err, containers) => {
      if (err) {
        onStart(err);
        return;
      }

      if (containers.length) {
        const container = containers[0];

        this.containerPorts[projectPath] = parseInt(container.Labels[`${this.labelPrefix}.port`], 10);

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

      this.createContainerPort((newContainerPort) => {
        this.containerPorts[projectPath] = newContainerPort;

        const opts = {
          Image: this.imageTag,
          name: containerName,
          Labels: {
              [`${this.labelPrefix}`]: '1',
              [`${this.labelPrefix}.path`]: projectPath,
              [`${this.labelPrefix}.port`]: newContainerPort.toString()
          },
          HostConfig: {
            Binds: [`${this.getBindingPath(projectPath)}:/web`],
            PortBindings: {
              '8000/tcp': [{
                HostPort: newContainerPort.toString(),
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

        atom.notifications.addInfo('Container is starting');
        docker.pull(this.imageTag, (errPull) => {
          if (errPull) {
            onStart(errPull);
            return;
          }
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
    });
  },

  isActiveFileRst() {
    if(!this.getCurrProjectPath()) {
      return false;
    }

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

    const projectPath = this.getCurrProjectPath();
    const containerIdx = this.getContainerIdx(projectPath);

    const relativePath = activeFilePath.replace(projectPath, '');
    const urlSuffix = relativePath.replace('rst', 'html').replace(/[/\\*]/g, '/');
    const fullUrl = `http://127.0.0.1:${this.getContainerPort(projectPath)}${urlSuffix}`;

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
