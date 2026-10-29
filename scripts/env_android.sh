#!/usr/bin/env bash
# Configuração de variáveis de ambiente para Android e Java no Fedora Distrobox
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
export JAVA_HOME="$HOME/Android/jdk-17"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
