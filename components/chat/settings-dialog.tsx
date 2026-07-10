"use client";

import {
  BarChart3Icon,
  BotIcon,
  BracesIcon,
  CheckIcon,
  CircleDollarSignIcon,
  ClipboardIcon,
  Code2Icon,
  CoinsIcon,
  CrownIcon,
  EyeIcon,
  KeyRoundIcon,
  LinkIcon,
  LockKeyholeIcon,
  PaletteIcon,
  PlugZapIcon,
  SearchIcon,
  Settings2Icon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersRoundIcon,
  XIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { getModelFallbacks, TENCENT_HY3_FREE_EXPIRES_AT } from "@/lib/ai/models";
import { subscriptionPlans } from "@/lib/billing/catalog";
import { cn, fetcher } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { RechargeDialog } from "./recharge-dialog";

type SettingsSection =
  | "general"
  | "account"
  | "privacy"
  | "billing"
  | "usage"
  | "capabilities"
  | "development"
  | "web"
  | "skills"
  | "connectors"
  | "plugins"
  | "team"
  | "api";

type UserSettings = {
  agentActionsEnabled: boolean;
  allowAnalytics: boolean;
  allowModelImprovement: boolean;
  appearance: "light" | "dark" | "system";
  avatarUrl: string;
  bio: string;
  displayName: string;
  instructions: string;
  nickname: string;
  webResearchEnabled: boolean;
};

type SettingsResponse = {
  settings: UserSettings;
  user: {
    credits: number;
    email: string;
    name: string | null;
    plan: string;
    planExpiresAt: string | null;
  };
};

type UsageResponse = {
  usage: {
    providerCostUsdMicros: number;
    requests: number;
    totalCredits: number;
    totalTokens: number;
  };
};

type ApiKey = {
  createdAt: string;
  id: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  name: string;
};

type Team = { createdAt: string; id: string; name: string; role: string };

type NavigationItem = {
  icon: typeof Settings2Icon;
  id: SettingsSection;
  label: string;
  group: "Paramètres" | "Personnaliser" | "Espace de travail";
};

const navigation: NavigationItem[] = [
  { group: "Paramètres", icon: Settings2Icon, id: "general", label: "Général" },
  { group: "Paramètres", icon: ShieldCheckIcon, id: "account", label: "Compte" },
  { group: "Paramètres", icon: LockKeyholeIcon, id: "privacy", label: "Confidentialité" },
  { group: "Paramètres", icon: CircleDollarSignIcon, id: "billing", label: "Facturation" },
  { group: "Paramètres", icon: BarChart3Icon, id: "usage", label: "Utilisation" },
  { group: "Paramètres", icon: SparklesIcon, id: "capabilities", label: "Capacités" },
  { group: "Paramètres", icon: Code2Icon, id: "development", label: "Développement" },
  { group: "Paramètres", icon: EyeIcon, id: "web", label: "Navigation web" },
  { group: "Personnaliser", icon: BracesIcon, id: "skills", label: "Compétences" },
  { group: "Personnaliser", icon: LinkIcon, id: "connectors", label: "Connecteurs" },
  { group: "Personnaliser", icon: PlugZapIcon, id: "plugins", label: "Plugins" },
  { group: "Espace de travail", icon: UsersRoundIcon, id: "team", label: "Équipe" },
  { group: "Espace de travail", icon: KeyRoundIcon, id: "api", label: "API" },
];

const initialSettings: UserSettings = {
  agentActionsEnabled: true,
  allowAnalytics: true,
  allowModelImprovement: false,
  appearance: "system",
  avatarUrl: "",
  bio: "",
  displayName: "",
  instructions: "",
  nickname: "",
  webResearchEnabled: true,
};

function getInitials(value: string) {
  return value
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

function Panel({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-8 md:px-10">
      <div className="mb-7">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Field({
  children,
  hint,
  label,
}: {
  children: React.ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      {label}
      {children}
      {hint ? <span className="font-normal text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function SettingSwitch({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-6 border-b border-border/60 py-4 last:border-b-0">
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
      </span>
      <input
        checked={checked}
        className="size-4 shrink-0 accent-foreground"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

export function SettingsDialog({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const { setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<UserSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [checkoutProductId, setCheckoutProductId] = useState<string | null>(null);
  const [apiKeyName, setApiKeyName] = useState("Production");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: settingsData, mutate: mutateSettings } = useSWR<SettingsResponse>(
    open ? "/api/user/settings" : null,
    fetcher
  );
  const { data: usageData } = useSWR<UsageResponse>(
    open ? "/api/user/usage" : null,
    fetcher
  );
  const { data: keysData, mutate: mutateKeys } = useSWR<{ keys: ApiKey[] }>(
    open ? "/api/user/api-keys" : null,
    fetcher
  );
  const { data: teamsData, mutate: mutateTeams } = useSWR<{ teams: Team[] }>(
    open ? "/api/teams" : null,
    fetcher
  );

  useEffect(() => {
    if (settingsData?.settings) {
      setDraft(settingsData.settings);
    }
  }, [settingsData]);

  const visibleNavigation = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");
    if (!normalizedQuery) {
      return navigation;
    }
    return navigation.filter((item) =>
      item.label.toLocaleLowerCase("fr").includes(normalizedQuery)
    );
  }, [query]);

  const persistSettings = async (changes: Partial<UserSettings>) => {
    const next = { ...draft, ...changes };
    setDraft(next);
    setIsSaving(true);
    try {
      const response = await fetch("/api/user/settings", {
        body: JSON.stringify(changes),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error("settings request failed");
      }
      const payload = await response.json();
      setDraft(payload.settings);
      await mutateSettings();
      toast.success("Paramètres enregistrés");
    } catch {
      setDraft(draft);
      toast.error("Impossible d’enregistrer les paramètres");
    } finally {
      setIsSaving(false);
    }
  };

  const createApiKey = async () => {
    try {
      const response = await fetch("/api/user/api-keys", {
        body: JSON.stringify({ name: apiKeyName }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("api key request failed");
      }
      const payload = await response.json();
      setCreatedSecret(payload.secret);
      await mutateKeys();
    } catch {
      toast.error("Impossible de créer la clé API");
    }
  };

  const revokeApiKey = async (id: string) => {
    const response = await fetch(`/api/user/api-keys?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      toast.error("Impossible de révoquer la clé");
      return;
    }
    await mutateKeys();
  };

  const createTeam = async () => {
    if (!teamName.trim()) {
      return;
    }
    const response = await fetch("/api/teams", {
      body: JSON.stringify({ name: teamName }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      toast.error("Impossible de créer l’équipe");
      return;
    }
    setTeamName("");
    await mutateTeams();
  };

  const deleteAccount = async () => {
    const response = await fetch("/api/user/account", {
      body: JSON.stringify({ confirmation: "DELETE" }),
      headers: { "Content-Type": "application/json" },
      method: "DELETE",
    });
    if (!response.ok) {
      toast.error("Impossible de supprimer le compte");
      return;
    }
    await signOut({ redirectTo: "/" });
  };

  const startCheckout = async (productId: string) => {
    try {
      setCheckoutProductId(productId);
      const response = await fetch("/api/payment/recharge", {
        body: JSON.stringify({ productId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Checkout unavailable");
      }
      window.location.assign(payload.url);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Paiement indisponible"
      );
      setCheckoutProductId(null);
    }
  };

  const renderPanel = () => {
    const user = settingsData?.user;
    const usage = usageData?.usage;

    switch (activeSection) {
      case "general":
        return (
          <Panel description="Identité, préférences de réponse et apparence." title="Général">
            <div className="flex items-center gap-4">
              {draft.avatarUrl ? (
                <img alt="Avatar" className="size-14 rounded-full object-cover" src={draft.avatarUrl} />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-full bg-foreground text-base font-semibold text-background">
                  {getInitials(draft.nickname || user?.email || "O")}
                </div>
              )}
              <Field hint="Utilise une image publique carrée." label="Avatar">
                <Input
                  onChange={(event) => setDraft({ ...draft, avatarUrl: event.target.value })}
                  placeholder="https://..."
                  value={draft.avatarUrl}
                />
              </Field>
            </div>
            <Field label="Nom">
              <Input onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} value={draft.displayName} />
            </Field>
            <Field label="Surnom">
              <Input onChange={(event) => setDraft({ ...draft, nickname: event.target.value })} placeholder="Comment l’agent doit-il vous appeler ?" value={draft.nickname} />
            </Field>
            <Field label="Description">
              <Textarea className="min-h-20 resize-none" onChange={(event) => setDraft({ ...draft, bio: event.target.value })} value={draft.bio} />
            </Field>
            <Field hint="Appliquées à chaque nouvelle réponse de l’agent." label="Instructions">
              <Textarea className="min-h-28 resize-y" onChange={(event) => setDraft({ ...draft, instructions: event.target.value })} value={draft.instructions} />
            </Field>
            <div className="space-y-2">
              <span className="text-sm font-medium">Apparence</span>
              <div className="flex gap-2">
                {(["light", "dark", "system"] as const).map((appearance) => (
                  <Button
                    key={appearance}
                    onClick={() => {
                      setTheme(appearance);
                      void persistSettings({ appearance });
                    }}
                    size="sm"
                    variant={draft.appearance === appearance ? "default" : "outline"}
                  >
                    {appearance === "light" ? "Clair" : appearance === "dark" ? "Sombre" : "Système"}
                  </Button>
                ))}
              </div>
            </div>
            <Button disabled={isSaving} onClick={() => void persistSettings(draft)}>
              <CheckIcon className="size-4" /> Enregistrer
            </Button>
          </Panel>
        );
      case "account":
        return (
          <Panel description="Connexion et gestion des données personnelles." title="Compte">
            <Field label="Email"><Input disabled value={user?.email ?? ""} /></Field>
            <div className="flex items-center justify-between border-b border-border/60 py-4">
              <span><span className="block text-sm font-medium">Session</span><span className="mt-1 block text-sm text-muted-foreground">Déconnecter cet appareil.</span></span>
              <Button onClick={() => signOut({ redirectTo: "/" })} variant="outline">Se déconnecter</Button>
            </div>
            <div className="border border-destructive/30 p-4">
              <span className="block text-sm font-medium text-destructive">Suppression du compte</span>
              <p className="mt-1 text-sm text-muted-foreground">Chats, crédits, clés API, préférences et équipes possédées seront supprimés.</p>
              {confirmDelete ? (
                <div className="mt-4 flex gap-2"><Button onClick={() => void deleteAccount()} variant="destructive">Supprimer définitivement</Button><Button onClick={() => setConfirmDelete(false)} variant="outline">Annuler</Button></div>
              ) : <Button className="mt-4" onClick={() => setConfirmDelete(true)} variant="destructive">Supprimer le compte</Button>}
            </div>
          </Panel>
        );
      case "privacy":
        return (
          <Panel description="Contrôlez précisément l’usage des données et des capacités de l’agent." title="Confidentialité">
            <div>
              <SettingSwitch checked={draft.allowModelImprovement} description="Vos évaluations anonymisées peuvent influencer le routeur de modèles." label="Amélioration des modèles" onChange={(allowModelImprovement) => void persistSettings({ allowModelImprovement })} />
              <SettingSwitch checked={draft.allowAnalytics} description="Mesures produit agrégées pour la fiabilité et les performances." label="Analytique produit" onChange={(allowAnalytics) => void persistSettings({ allowAnalytics })} />
              <SettingSwitch checked={draft.webResearchEnabled} description="Autorise l’agent à consulter le web lorsque la demande exige des informations à jour." label="Recherche web vérifiée" onChange={(webResearchEnabled) => void persistSettings({ webResearchEnabled })} />
            </div>
          </Panel>
        );
      case "billing":
        return (
          <Panel description="Plan, crédits et paiement Mobile Money sécurisé." title="Facturation">
            <div className="grid grid-cols-2 divide-x divide-border border border-border/70">
              <div className="p-4"><span className="text-xs text-muted-foreground">Plan actuel</span><strong className="mt-1 block text-lg capitalize">{user?.plan ?? "free"}</strong></div>
              <div className="p-4"><span className="text-xs text-muted-foreground">Crédits disponibles</span><strong className="mt-1 block text-lg">{formatNumber(user?.credits ?? 0)}</strong></div>
            </div>
            {user?.planExpiresAt ? <p className="text-sm text-muted-foreground">Plan actif jusqu’au {formatDate(user.planExpiresAt)}.</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {subscriptionPlans.map((plan) => (
                <div className="border border-border/70 p-4" key={plan.id}>
                  <div className="flex items-start justify-between gap-3"><div><strong className="block text-base">{plan.label}</strong><span className="mt-1 block text-sm text-muted-foreground">{formatNumber(plan.credits)} crédits / 30 jours</span></div><strong className="text-sm">{formatNumber(plan.priceXaf)} FCFA</strong></div>
                  <p className="mt-3 text-sm text-muted-foreground">Routage prioritaire, limites augmentées et toutes les capacités de l’agent.</p>
                  <Button className="mt-4 w-full" disabled={checkoutProductId !== null} onClick={() => void startCheckout(plan.id)} variant={plan.recommended ? "default" : "outline"}>{checkoutProductId === plan.id ? "Ouverture du paiement..." : user?.plan === plan.plan ? "Prolonger" : `Passer ${plan.label}`}</Button>
                </div>
              ))}
            </div>
            <Button onClick={() => setShowRecharge(true)}><CoinsIcon className="size-4" /> Recharger les crédits</Button>
            <p className="text-sm text-muted-foreground">Un plan est valable 30 jours et ne se renouvelle pas automatiquement. Les crédits achetés restent acquis. Tencent Hy3 est temporairement gratuit jusqu’au 21 juillet.</p>
          </Panel>
        );
      case "usage":
        return (
          <Panel description="Les 30 derniers jours, calculés à partir des requêtes réellement terminées." title="Utilisation">
            <div className="grid gap-px overflow-hidden border border-border/70 bg-border sm:grid-cols-2">
              {[
                ["Requêtes", formatNumber(usage?.requests ?? 0)],
                ["Crédits consommés", formatNumber(usage?.totalCredits ?? 0)],
                ["Tokens traités", formatNumber(usage?.totalTokens ?? 0)],
                ["Coût fournisseur", `$${((usage?.providerCostUsdMicros ?? 0) / 1_000_000).toFixed(4)}`],
              ].map(([label, value]) => <div className="bg-background p-4" key={label}><span className="text-xs text-muted-foreground">{label}</span><strong className="mt-1 block text-lg">{value}</strong></div>)}
            </div>
            <p className="text-sm text-muted-foreground">Ces données alimentent aussi le suivi de marge du SaaS, sans exposer de contenu de conversation.</p>
          </Panel>
        );
      case "capabilities":
        return (
          <Panel description="Capacités accordées à l’agent et politique de routage." title="Capacités">
            <SettingSwitch checked={draft.agentActionsEnabled} description="Documents, suggestions et automatisations demandent une validation lorsque nécessaire." label="Actions de l’agent" onChange={(agentActionsEnabled) => void persistSettings({ agentActionsEnabled })} />
            <div className="border-y border-border/60 py-4"><span className="block text-sm font-medium">Modèle gratuit par défaut</span><p className="mt-1 text-sm text-muted-foreground">Tencent Hy3, contexte 262 k, raisonnement et outils. Expire le {formatDate(TENCENT_HY3_FREE_EXPIRES_AT)}.</p><p className="mt-2 text-xs text-muted-foreground">Repli contrôlé : {getModelFallbacks("tencent/hy3:free").join(" puis ")}</p></div>
            <div className="flex flex-wrap gap-2"><span className="border border-border px-2 py-1 text-xs">Recherche web</span><span className="border border-border px-2 py-1 text-xs">Documents</span><span className="border border-border px-2 py-1 text-xs">Images</span><span className="border border-border px-2 py-1 text-xs">Météo</span></div>
          </Panel>
        );
      case "development":
        return <Panel description="Surface de travail orientée code, reliée aux outils de génération et d’édition de documents." title="Développement"><div className="border-y border-border/60 py-4"><span className="block text-sm font-medium">Mode code</span><p className="mt-1 text-sm text-muted-foreground">L’agent peut analyser, générer et réviser des projets dans les artefacts, avec la même règle de validation que les autres actions.</p></div><Button onClick={() => setActiveSection("capabilities")} variant="outline">Gérer les capacités</Button></Panel>;
      case "web":
        return <Panel description="Navigation et vérification d’informations actuelles depuis une conversation." title="Navigation web"><div className="border-y border-border/60 py-4"><span className="block text-sm font-medium">Recherche web</span><p className="mt-1 text-sm text-muted-foreground">La recherche vérifiée est pilotée dans Confidentialité et n’est appelée que lorsque la demande le justifie.</p></div><Button onClick={() => setActiveSection("privacy")} variant="outline">Gérer la confidentialité</Button></Panel>;
      case "skills":
        return <Panel description="Compétences de l’agent disponibles pour exécuter un travail concret." title="Compétences"><div className="divide-y divide-border/60 border-y border-border/60">{["Analyse de fichiers", "Création de documents", "Recherche web", "Génération d’images", "Raisonnement et code"].map((skill) => <div className="flex items-center justify-between py-4" key={skill}><span className="text-sm font-medium">{skill}</span><span className="text-xs text-muted-foreground">Disponible</span></div>)}</div></Panel>;
      case "connectors":
        return <Panel description="Les connecteurs tiers n’accèdent à aucun compte sans autorisation OAuth explicite." title="Connecteurs"><div className="divide-y divide-border/60 border-y border-border/60">{["Web", "Google Drive", "Notion", "GitHub"].map((connector) => <div className="flex items-center justify-between py-4" key={connector}><span className="text-sm font-medium">{connector}</span><Button size="sm" variant="outline">Configurer</Button></div>)}</div></Panel>;
      case "plugins":
        return <Panel description="Extensions locales approuvées qui enrichissent les actions de l’agent." title="Plugins"><div className="divide-y divide-border/60 border-y border-border/60">{["Recherche et citations", "Documents", "Outils de développement"].map((plugin) => <div className="flex items-center justify-between py-4" key={plugin}><span className="text-sm font-medium">{plugin}</span><span className="text-xs text-muted-foreground">Activé</span></div>)}</div></Panel>;
      case "team":
        return (
          <Panel description="Espaces partagés et rôles pour les équipes." title="Équipe">
            <div className="flex gap-2"><Input onChange={(event) => setTeamName(event.target.value)} placeholder="Nom de l’équipe" value={teamName} /><Button onClick={() => void createTeam()}><UsersRoundIcon className="size-4" /> Créer</Button></div>
            <div className="divide-y divide-border/60 border-y border-border/60">{teamsData?.teams?.length ? teamsData.teams.map((team) => <div className="flex items-center justify-between py-4" key={team.id}><span><span className="block text-sm font-medium">{team.name}</span><span className="text-xs text-muted-foreground">Créée le {formatDate(team.createdAt)}</span></span><span className="text-xs capitalize text-muted-foreground">{team.role}</span></div>) : <div className="py-6 text-sm text-muted-foreground">Aucune équipe créée.</div>}</div>
          </Panel>
        );
      case "api":
        return (
          <Panel description="Clés personnelles pour l’intégration serveur. La valeur complète n’est affichée qu’une fois." title="API">
            <div className="flex gap-2"><Input onChange={(event) => setApiKeyName(event.target.value)} value={apiKeyName} /><Button onClick={() => void createApiKey()}><KeyRoundIcon className="size-4" /> Créer une clé</Button></div>
            {createdSecret ? <div className="border border-amber-500/40 bg-amber-500/5 p-4"><span className="block text-sm font-medium">Conservez cette clé maintenant</span><code className="mt-3 block break-all border border-border bg-background p-3 text-xs">{createdSecret}</code><Button className="mt-3" onClick={() => navigator.clipboard.writeText(createdSecret)} size="sm" variant="outline"><ClipboardIcon className="size-3.5" /> Copier</Button></div> : null}
            <div className="divide-y divide-border/60 border-y border-border/60">{keysData?.keys?.length ? keysData.keys.map((key) => <div className="flex items-center justify-between gap-4 py-4" key={key.id}><span><span className="block text-sm font-medium">{key.name}</span><span className="font-mono text-xs text-muted-foreground">{key.keyPrefix}...</span></span><Button onClick={() => void revokeApiKey(key.id)} size="sm" variant="outline">Révoquer</Button></div>) : <div className="py-6 text-sm text-muted-foreground">Aucune clé API active.</div>}</div>
          </Panel>
        );
    }
  };

  return (
    <>
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent className="settings-dialog-content h-[min(720px,calc(100dvh-2rem))] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-xl border-border/70 bg-background p-0 sm:max-w-[1024px]" showCloseButton={false}>
          <DialogTitle className="sr-only">Paramètres</DialogTitle>
          <div className="flex min-h-0 flex-1">
            <aside className="flex w-64 shrink-0 flex-col border-r border-border/70 bg-muted/25 p-3 max-md:w-14">
              <div className="mb-4 flex items-center justify-between px-1"><span className="font-semibold max-md:sr-only">Paramètres</span><Button aria-label="Fermer les paramètres" onClick={() => onOpenChange(false)} size="icon-sm" title="Fermer" variant="ghost"><XIcon className="size-4" /></Button></div>
              <div className="relative mb-4 max-md:hidden"><SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" /><Input className="h-8 pl-8 text-xs" onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher" value={query} /></div>
              <nav className="min-h-0 flex-1 overflow-y-auto">
                {(["Paramètres", "Personnaliser", "Espace de travail"] as const).map((group) => {
                  const items = visibleNavigation.filter((item) => item.group === group);
                  if (!items.length) return null;
                  return <div className="mb-4" key={group}><p className="mb-1 px-2 text-[11px] font-medium text-muted-foreground max-md:hidden">{group}</p>{items.map((item) => { const Icon = item.icon; return <button className={cn("flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors hover:bg-accent", activeSection === item.id && "bg-accent font-medium text-foreground")} key={item.id} onClick={() => setActiveSection(item.id)} title={item.label} type="button"><Icon className="size-4 shrink-0" /><span className="truncate max-md:hidden">{item.label}</span></button>; })}</div>;
                })}
              </nav>
            </aside>
            <main className="min-w-0 flex-1 overflow-y-auto">{renderPanel()}</main>
          </div>
        </DialogContent>
      </Dialog>
      <RechargeDialog onOpenChange={setShowRecharge} open={showRecharge} />
    </>
  );
}
