"use client";

import { ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import Link from "next/link";
import * as React from "react";

type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const starters = [
  "Ce qui m’a le plus marqué",
  "M’aider à comprendre la fin",
  "Parler de l’ambiance",
];

export default function JournalConversation({
  movieTitle,
  messages,
  pending,
  onSend,
  initialViewingDate,
  backHref,
}: {
  movieTitle: string;
  messages: ConversationMessage[];
  pending: boolean;
  onSend: (message: string) => Promise<boolean>;
  initialViewingDate: string | null;
  backHref: string;
}) {
  const [message, setMessage] = React.useState("");
  const [failedMessage, setFailedMessage] = React.useState<string | null>(null);
  const [optimisticMessage, setOptimisticMessage] = React.useState<ConversationMessage | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const hasMountedRef = React.useRef(false);
  const sendingRef = React.useRef(false);

  const resizeComposer = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, []);

  React.useEffect(() => resizeComposer(), [message, resizeComposer]);

  React.useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    messagesEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length, pending]);

  const send = async (value = message, preserveDraft = false) => {
    const nextMessage = value.trim();
    if (!nextMessage || pending || sendingRef.current) return;

    sendingRef.current = true;
    if (!preserveDraft) setMessage("");
    setFailedMessage(null);
    setOptimisticMessage({
      id: `optimistic-${Date.now()}`,
      role: "user",
      content: nextMessage,
    });

    let sent = false;
    try {
      sent = await onSend(nextMessage);
    } catch {
      sent = false;
    } finally {
      sendingRef.current = false;
      setOptimisticMessage(null);
    }
    if (!sent) setFailedMessage(nextMessage);
  };

  const selectStarter = (starter: string) => {
    setMessage(starter);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <main id="main-content" className="zen-conversation-page" aria-labelledby="journal-chat-title">
      <header className="zen-conversation-page__header">
        <div className="zen-conversation-page__header-inner">
          <Link href={backHref} className="zen-conversation-page__back" aria-label={`Revenir à la fiche de ${movieTitle}`}>
            <ArrowLeft aria-hidden="true" />
          </Link>
          <div className="zen-conversation-page__identity">
            <span className="zen-conversation-page__avatar" aria-hidden="true">Z</span>
            <div>
              <h1 id="journal-chat-title">Zen</h1>
              <p>{movieTitle}</p>
            </div>
          </div>
          <span className="zen-conversation-page__header-spacer" aria-hidden="true" />
        </div>
      </header>

      <div className="zen-journal-chat__messages" aria-live="polite">
        <div className="zen-journal-chat__messages-inner">
          {messages.length === 0 && !optimisticMessage && !pending && (
            <div className="zen-chat-welcome">
              <span className="zen-chat-welcome__avatar" aria-hidden="true">Z</span>
              <p className="zen-chat-welcome__question">Qu’est-ce qui t’a suivi après le générique&nbsp;?</p>
              <p className="zen-chat-welcome__hint">Écris librement ou choisis un point de départ.</p>
              {initialViewingDate && (
                <p className="zen-chat-welcome__date">
                  Ce premier échange créera ton visionnage du {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${initialViewingDate}T12:00:00`))}.
                </p>
              )}
              <div className="zen-journal-chat__starters" aria-label="Points de départ suggérés">
                {starters.map((starter) => (
                  <button key={starter} type="button" onClick={() => selectStarter(starter)}>
                    {starter}
                    <ArrowRight aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((item) => (
            <div key={item.id} className={`zen-chat-row zen-chat-row--${item.role}`}>
              <div className={`zen-chat-bubble zen-chat-bubble--${item.role}`}>
                {item.content}
              </div>
            </div>
          ))}

          {optimisticMessage && (
            <div className="zen-chat-row zen-chat-row--user">
              <div className="zen-chat-bubble zen-chat-bubble--user">
                {optimisticMessage.content}
              </div>
            </div>
          )}

          {pending && (
            <div className="zen-chat-row zen-chat-row--assistant" role="status">
              <div className="zen-chat-bubble zen-chat-bubble--assistant zen-chat-typing">
                <span /><span /><span />
                <span className="sr-only">Zen prépare une réponse</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <footer className="zen-conversation-page__footer">
        <div className="zen-conversation-page__footer-inner">
          {failedMessage && (
            <div className="zen-journal-chat__error" role="alert">
              <span>Le message n’a pas pu être envoyé.</span>
              <button type="button" onClick={() => void send(failedMessage, true)}>Réessayer</button>
            </div>
          )}
          <form className="zen-journal-chat__composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
            <label htmlFor="journal-message" className="sr-only">Ton message</label>
            <textarea
              ref={textareaRef}
              id="journal-message"
              rows={1}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder="Écris à Zen…"
              enterKeyHint="send"
            />
            <button type="submit" disabled={!message.trim() || pending} aria-label="Envoyer le message">
              <ArrowUp aria-hidden="true" />
            </button>
          </form>
          <p className="zen-journal-chat__privacy">
            <span>Ton échange reste lié à ce film.</span>
            <span className="zen-journal-chat__shortcut">⌘ ou Ctrl + Entrée pour envoyer</span>
          </p>
        </div>
      </footer>
    </main>
  );
}
