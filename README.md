# sphinx-preview
[Sphinx](http://www.sphinx-doc.org/) preview in Atom


![sphinxdemo](https://raw.githubusercontent.com/dldl/sphinx-preview/master/sphinxdemo.gif)

## Dependencies
This package needs `Docker` and `browser-plus` atom package.

### Docker
Install docker   
https://docs.docker.com/engine/installation/

### browser-plus
Install the `browser-plus` package
In a cli :
```
apm install browser-plus
```
Or via the `Settings View : Install` in Atom

## Usage
- Open Atom in your sphinx-doc project root folder.
- Press `ctrl-alt-o` on a `rst` file to open the sphinx-preview

## How it works ?
sphinx-preview pull and run the [sphinx-server](https://hub.docker.com/r/dldl/sphinx-server/). It mounts the right folder based on the opened project. Eventually, the package launch a [browser-plus](https://atom.io/packages/browser-plus) panel on the active `rst` file.
