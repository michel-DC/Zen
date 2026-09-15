import Image from "next/image";
import { MonitorOff, Smartphone } from "lucide-react";

export default function PhoneOnlyGate() {
  return (
    <main className="zen-desktop-gate" aria-labelledby="phone-only-title">
      <div className="zen-desktop-gate__frame">
        <div className="zen-desktop-gate__brand" aria-label="Zen">
          <Image src="/icons/favicon.png" alt="" width={30} height={30} />
          <span>Zen</span>
        </div>

        <div className="zen-desktop-gate__visual" aria-hidden="true">
          <img src="/illustrations/access-denied-zen.svg" alt="" />
        </div>

        <section className="zen-desktop-gate__message">
          <p className="zen-desktop-gate__status">
            <MonitorOff aria-hidden="true" />
            Écran non pris en charge
          </p>
          <h1 id="phone-only-title">Zen reste dans la poche.</h1>
          <p className="zen-desktop-gate__lead">
            Ce n’est pas toi, c’est l’écran. Zen est désormais réservé aux téléphones.
          </p>
          <div className="zen-desktop-gate__hint">
            <Smartphone aria-hidden="true" />
            <p>
              <strong>Pour continuer,</strong>
              <span> ouvre cette page depuis ton téléphone.</span>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
