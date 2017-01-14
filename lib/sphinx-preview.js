'use babel';

import SphinxPreviewView from './sphinx-preview-view';
import { CompositeDisposable } from 'atom';

export default {

  sphinxPreviewView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.sphinxPreviewView = new SphinxPreviewView(state.sphinxPreviewViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.sphinxPreviewView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'sphinx-preview:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.sphinxPreviewView.destroy();
  },

  serialize() {
    return {
      sphinxPreviewViewState: this.sphinxPreviewView.serialize()
    };
  },

  toggle() {
    console.log('SphinxPreview was toggled!');
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
