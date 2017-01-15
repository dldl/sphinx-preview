'use babel';

import { CompositeDisposable } from 'atom';
import Docker from 'dockerode';

import SphinxPreviewView from './sphinx-preview-view';

export default {

  sphinxPreviewView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.sphinxPreviewView = new SphinxPreviewView(state.sphinxPreviewViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.sphinxPreviewView.getElement(),
      visible: false,
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'sphinx-preview:toggle': () => this.toggle(),
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.sphinxPreviewView.destroy();
  },

  serialize() {
    return {
      sphinxPreviewViewState: this.sphinxPreviewView.serialize(),
    };
  },

  toggle() {
    console.log('SphinxPreview was toggled!');
    this.startSphinxServer();
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
