"use client";

import { ArrowUp, Sparkles } from "lucide-react";
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
}: {
  movieTitle: string;
  messages: ConversationMessage[];
  pending: boolean;
  onSend: (message: string) => Promise<boolean>;
  initialViewingDate: string | null;
}) {
  const [message, setMessage] = React.useState("");
  const [failedMessage, setFailedMessage] = React.useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const hasMountedRef = React.useRef(false);

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

  const send = async (value = message) => {
    const nextMessage = value.trim();
    if (!nextMessage || pending) return;
    setFailedMessage(null);
    const sent = await onSend(nextMessage);
    if (sent) setMessage("");
    else setFailedMessage(nextMessage);
  };

  const selectStarter = (starter: string) => {
    setMessage(starter);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <section className="zen-journal-chat" aria-labelledby="journal-chat-title">
      <header className="zen-journal-chat__header">
        <h3 id="journal-chat-title">Parler de {movieTitle}</h3>
        <p>
          <Sparkles aria-hidden="true" />
          Zen s’appuie sur ce film et sur cet échange pour te répondre.
        </p>
      </header>

      <div className={`zen-journal-chat__messages${messages.length === 0 ? " zen-journal-chat__messages--empty" : ""}`} aria-live="polite">
        {messages.length === 0 && (
          <div className="zen-chat-welcome">
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
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((item) => (
          <div key={item.id} className={`zen-chat-row zen-chat-row--${item.role}`}>
            {item.role === "assistant" && <span className="zen-chat-speaker">Zen</span>}
            <div className={`zen-chat-bubble zen-chat-bubble--${item.role}`}>
              {item.content}
            </div>
          </div>
        ))}

        {pending && (
          <div className="zen-chat-row zen-chat-row--assistant" role="status">
            <span className="zen-chat-speaker">Zen écrit</span>
            <div className="zen-chat-bubble zen-chat-bubble--assistant zen-chat-typing">
              <span /><span /><span />
              <span className="sr-only">Zen prépare une réponse</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {failedMessage && (
        <div className="zen-journal-chat__error" role="alert">
          <span>Impossible d’envoyer ce message.</span>
          <button type="button" onClick={() => void send(failedMessage)}>Réessayer</button>
        </div>
      )}

      <div className="zen-journal-chat__composer">
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
          enterKeyHint="enter"
        />
        <button
          type="button"
          disabled={!message.trim() || pending}
          onClick={() => void send()}
          aria-label="Envoyer le message"
        >
          <ArrowUp />
        </button>
      </div>
      <p className="zen-journal-chat__privacy">
        <span>Ton échange reste lié à ce film.</span>
        <span className="zen-journal-chat__shortcut">⌘ ou Ctrl + Entrée pour envoyer</span>
      </p>
    </section>
  );
}
