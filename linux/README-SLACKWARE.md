# Xadrez 3D Master — Executável para Slackware Linux (KDE e Xfce)

O arquivo **`linux/xadrez-3d-master`** é um executável único e portátil (contém toda a build compilada do jogo embutida) projetado para rodar offline no **Slackware Linux** (14.2, 15.0 ou `-current`), nos ambientes **KDE Plasma** e **Xfce**.

## Como executar diretamente (sem instalar)

No terminal (`Konsole` no KDE ou `xfce4-terminal` no Xfce), ou dando duplo clique pelo **Dolphin** (KDE) / **Thunar** (Xfce):

```bash
chmod +x linux/xadrez-3d-master
./linux/xadrez-3d-master
```

- Se você tiver **Chromium**, **Google Chrome**, **Brave** ou **Vivaldi** instalado, o jogo abrirá em uma **janela desktop dedicada** (sem barras de navegador), e o servidor local encerrará automaticamente quando você fechar a janela.
- Caso use **Firefox** ou **Falkon** (padrão do KDE), o jogo abrirá em uma nova janela do navegador. Para encerrar o servidor em segundo plano depois, rode:
  ```bash
  ./linux/xadrez-3d-master --stop
  ```

## Instalar no Menu Iniciar do KDE e do Xfce

Para adicionar o ícone e o atalho na categoria **Jogos** do menu do KDE / Xfce (e na Área de Trabalho):

```bash
chmod +x linux/instalar-kde-xfce.sh
./linux/instalar-kde-xfce.sh
```

## Requisitos no Slackware

Apenas pacotes padrão de uma instalação normal do Slackware:
- `python3` (ou `node`)
- `bash`, `tar`, `gzip`
- Um navegador com suporte a WebGL (`chromium`, `google-chrome`, `firefox` ou `falkon`).

## Como gerar novamente após alterações no código

```bash
npm run build:slackware
```
