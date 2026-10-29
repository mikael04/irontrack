import React, { useState, useEffect, useCallback } from 'react';
import {
  Cloud,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  Check,
  Share2,
  X,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GoogleDriveSyncService } from '../services/sync/GoogleDriveSyncService';
import { GOOGLE_APPS_SCRIPT_CODE } from '../services/sync/googleAppsScriptCode';

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const { t } = useTranslation();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | null>(null);
  const [lastSyncSummary, setLastSyncSummary] = useState<string | null>(null);

  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showHelpModal, setShowHelpModal] = useState(false);
  const [hasCopiedScript, setHasCopiedScript] = useState(false);

  const loadSyncInfo = useCallback(async () => {
    try {
      const [url, time, summary] = await Promise.all([
        GoogleDriveSyncService.getWebhookUrl(),
        GoogleDriveSyncService.getLastSyncTimestamp(),
        GoogleDriveSyncService.getLastSyncSummary(),
      ]);
      setWebhookUrl(url || '');
      setLastSyncTimestamp(time);
      setLastSyncSummary(summary);
    } catch (e) {
      console.error('Failed to load sync info', e);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void loadSyncInfo();
      setTestResult(null);
      setStatusMessage(null);
    }
  }, [isOpen, loadSyncInfo]);

  if (!isOpen) return null;

  const handleSaveUrl = async (url: string) => {
    setWebhookUrl(url);
    await GoogleDriveSyncService.setWebhookUrl(url);
  };

  const handleTestConnection = async () => {
    if (!webhookUrl.trim()) {
      setTestResult({
        success: false,
        message: t('sync_err_no_url', 'Por favor, informe a URL do Webhook.'),
      });
      return;
    }

    setTestingWebhook(true);
    setTestResult(null);
    setStatusMessage(null);
    await GoogleDriveSyncService.setWebhookUrl(webhookUrl);

    const res = await GoogleDriveSyncService.testConnection(webhookUrl);
    setTestingWebhook(false);
    setTestResult(res);
  };

  const handleSync = async () => {
    if (!webhookUrl.trim()) {
      setStatusMessage({
        type: 'error',
        text: t('sync_err_no_url', 'Por favor, informe a URL do Webhook antes de sincronizar.'),
      });
      return;
    }

    setIsSyncing(true);
    setStatusMessage(null);
    setTestResult(null);

    await GoogleDriveSyncService.setWebhookUrl(webhookUrl);
    const res = await GoogleDriveSyncService.syncToGoogleSheets();
    setIsSyncing(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      await loadSyncInfo();
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  const handleRestore = async () => {
    if (!webhookUrl.trim()) {
      setStatusMessage({
        type: 'error',
        text: t('sync_err_no_url', 'Por favor, informe a URL do Webhook do Google Apps Script.'),
      });
      return;
    }

    const confirmRestore = window.confirm(
      t(
        'sync_confirm_restore',
        'Deseja restaurar os dados salvos na nuvem do Google? Os dados do seu treino atual serão atualizados com o backup salvo no Google Drive.',
      ),
    );

    if (!confirmRestore) return;

    setIsRestoring(true);
    setStatusMessage(null);
    setTestResult(null);

    await GoogleDriveSyncService.setWebhookUrl(webhookUrl);
    const res = await GoogleDriveSyncService.restoreFromGoogleSheets();
    setIsRestoring(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
      await loadSyncInfo();
      if (onDataRestored) {
        onDataRestored();
      }
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setHasCopiedScript(true);
      setTimeout(() => setHasCopiedScript(false), 3000);
    } catch {
      // Fallback para input temporário
      const el = document.createElement('textarea');
      el.value = GOOGLE_APPS_SCRIPT_CODE;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setHasCopiedScript(true);
      setTimeout(() => setHasCopiedScript(false), 3000);
    }
  };

  const handleShareScript = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'IronTrack - Google Apps Script',
          text: GOOGLE_APPS_SCRIPT_CODE,
        });
      } catch (err) {
        console.warn('Share cancelled or not supported', err);
      }
    } else {
      await handleCopyScript();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gym-900 border border-gym-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gym-800 flex justify-between items-center shrink-0 bg-gym-900">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gym-accent/10 border border-gym-accent/20">
              <Cloud size={20} className="text-gym-accent" />
            </div>
            <div>
              <h3 className="font-bold text-white leading-tight">
                {t('google_sync_title', 'Sincronização Google Sheets & Drive')}
              </h3>
              <p className="text-xs text-gym-400">
                {t('google_sync_subtitle', 'Backup na nuvem e planilha online na sua conta Google')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gym-400 hover:text-white hover:bg-gym-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-grow">
          {/* Status Banner */}
          {lastSyncTimestamp ? (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-semibold text-emerald-300">
                  {t('sync_last_done', 'Última sincronização realizada com sucesso')}
                </div>
                <div className="text-slate-300 mt-0.5">
                  {new Date(lastSyncTimestamp).toLocaleString('pt-BR')}
                </div>
                {lastSyncSummary && (
                  <div className="text-slate-400 mt-1 text-[11px] font-mono">
                    {lastSyncSummary}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-gym-800/40 border border-gym-700/60 text-xs text-gym-400 text-center">
              {t('sync_never_synced', 'Nenhuma sincronização na nuvem realizada ainda neste aparelho.')}
            </div>
          )}

          {/* Webhook URL Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {t('sync_webhook_url_label', 'URL do Webhook (Google Apps Script)')}
            </label>
            <div className="relative">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => handleSaveUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full bg-gym-950 border border-gym-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-gym-accent pr-9"
              />
              {webhookUrl.length > 0 && (
                <button
                  onClick={() => handleSaveUrl('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gym-500 hover:text-white"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <p className="text-[11px] text-gym-500">
              {t('sync_webhook_help_tip', 'Custo zero, sem Google Cloud Console, executado no seu próprio Google Drive.')}
            </p>
          </div>

          {/* Action Row: Test & Instructions */}
          <div className="flex gap-2.5">
            <button
              onClick={handleTestConnection}
              disabled={testingWebhook || !webhookUrl.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gym-700 hover:border-gym-600 bg-gym-800/50 hover:bg-gym-800 text-xs font-medium text-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {testingWebhook ? (
                <>
                  <Loader2 size={14} className="animate-spin text-gym-accent" />
                  <span>{t('testing', 'Testando...')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} className="text-gym-accent" />
                  <span>{t('test_connection', 'Testar Conexão')}</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowHelpModal(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-gym-700 hover:border-gym-accent hover:bg-gym-accent/5 text-xs font-medium text-gym-accent transition-colors"
            >
              <HelpCircle size={14} />
              <span>{t('how_to_setup', 'Como Configurar')}</span>
            </button>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in ${
                testResult.success
                  ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/40 border border-red-500/40 text-red-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">{testResult.message}</div>
            </div>
          )}

          {/* Status Message (Sync or Restore outcome) */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/40 border border-red-500/40 text-red-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">{statusMessage.text}</div>
            </div>
          )}

          {/* Sync & Restore Big Buttons */}
          <div className="pt-2 space-y-2.5">
            <button
              onClick={handleSync}
              disabled={isSyncing || isRestoring || !webhookUrl.trim()}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-gym-accent hover:bg-gym-accentHover text-white font-semibold text-sm shadow-lg shadow-gym-accent/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              {isSyncing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{t('syncing', 'Sincronizando com Google Sheets...')}</span>
                </>
              ) : (
                <>
                  <UploadCloud size={18} className="transition-transform group-hover:-translate-y-0.5" />
                  <span>{t('sync_now_button', 'Sincronizar com Google Sheets')}</span>
                </>
              )}
            </button>

            <button
              onClick={handleRestore}
              disabled={isSyncing || isRestoring || !webhookUrl.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-blue-500/60 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 font-medium text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isRestoring ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{t('restoring', 'Restaurando dados do Google Drive...')}</span>
                </>
              ) : (
                <>
                  <DownloadCloud size={16} />
                  <span>{t('restore_now_button', 'Restaurar do Google Sheets')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Help / Setup Guide Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-gym-900 border border-gym-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Guide Header */}
            <div className="p-4 border-b border-gym-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle size={20} className="text-gym-accent" />
                <h3 className="font-bold text-white text-sm">
                  {t('guide_title', 'Como Configurar o Google Sheets')}
                </h3>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 rounded-lg text-gym-400 hover:text-white hover:bg-gym-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Guide Steps */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300 flex-grow">
              <div className="p-3 rounded-xl bg-gym-800/40 border border-gym-700/60 leading-relaxed text-slate-300">
                A sincronização é 100% gratuita e roda na sua conta pessoal do Google, sem necessidade de cadastrar cartão ou criar projeto no Google Cloud Console.
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-gym-accent/20 text-gym-accent font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </div>
                  <div>
                    <span className="font-semibold text-white">Acesse o Google Apps Script:</span>
                    <p className="text-slate-400 mt-0.5">
                      Abra o site{' '}
                      <a
                        href="https://script.google.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-gym-accent underline inline-flex items-center gap-0.5"
                      >
                        script.google.com <ExternalLink size={10} />
                      </a>{' '}
                      no navegador e clique em <b>"Novo projeto"</b>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-gym-accent/20 text-gym-accent font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </div>
                  <div>
                    <span className="font-semibold text-white">Cole o script:</span>
                    <p className="text-slate-400 mt-0.5">
                      Apague o código padrão que aparece no editor e cole todo o conteúdo do script do IronTrack (use o botão abaixo para copiar).
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-gym-accent/20 text-gym-accent font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </div>
                  <div>
                    <span className="font-semibold text-white">Inicie a Implantação:</span>
                    <p className="text-slate-400 mt-0.5">
                      No canto superior direito, clique em <b>"Implantar"</b> &gt; <b>"Nova implantação"</b>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-gym-accent/20 text-gym-accent font-bold flex items-center justify-center shrink-0 text-[11px]">
                    4
                  </div>
                  <div>
                    <span className="font-semibold text-white">Selecione Aplicativo da Web:</span>
                    <p className="text-slate-400 mt-0.5">
                      No ícone de engrenagem, escolha <b>"Aplicativo da Web"</b>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-gym-accent/20 text-gym-accent font-bold flex items-center justify-center shrink-0 text-[11px]">
                    5
                  </div>
                  <div>
                    <span className="font-semibold text-white">Configure o Acesso (Importante):</span>
                    <ul className="list-disc pl-4 mt-0.5 text-slate-400 space-y-0.5">
                      <li><b>Executar como:</b> "Eu (seu e-mail)"</li>
                      <li><b>Quem pode acessar:</b> "Qualquer pessoa" (ou Qualquer um com o link)</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-gym-accent/20 text-gym-accent font-bold flex items-center justify-center shrink-0 text-[11px]">
                    6
                  </div>
                  <div>
                    <span className="font-semibold text-white">Autorize e Copie a URL:</span>
                    <p className="text-slate-400 mt-0.5">
                      Clique em "Implantar", autorize o acesso com sua conta Google e copie a <b>URL do aplicativo da Web</b> gerada (termina com <code className="text-gym-accent">/exec</code>).
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-gym-accent/20 text-gym-accent font-bold flex items-center justify-center shrink-0 text-[11px]">
                    7
                  </div>
                  <div>
                    <span className="font-semibold text-white">Cole e Sincronize:</span>
                    <p className="text-slate-400 mt-0.5">
                      Cole a URL no campo do IronTrack e clique em <b>"Sincronizar com Google Sheets"</b>. Uma planilha com 4 abas e seu backup JSON serão criados no seu Google Drive!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Guide Footer */}
            <div className="p-4 border-t border-gym-800 bg-gym-950/60 flex items-center justify-between gap-3 shrink-0">
              <button
                onClick={handleShareScript}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gym-700 hover:border-gym-600 text-xs text-slate-300 hover:text-white transition-colors"
              >
                <Share2 size={14} />
                <span>Compartilhar</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyScript}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gym-accent hover:bg-gym-accentHover text-white text-xs font-semibold transition-colors"
                >
                  {hasCopiedScript ? (
                    <>
                      <Check size={14} />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copiar Script</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
