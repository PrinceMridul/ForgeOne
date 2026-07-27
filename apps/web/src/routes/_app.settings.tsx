import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Breadcrumb } from "@/components/breadcrumb";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings · ForgeOne" },
      {
        name: "description",
        content: "Model selection, theme, workspace, and environment configuration.",
      },
      { property: "og:title", content: "Settings · ForgeOne" },
      { property: "og:description", content: "Configure your ForgeOne workspace." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
      <Breadcrumb items={[{ label: "Settings" }]} />
      <PageHeader
        title="Settings"
        description="Manage models, appearance, workspace, and secrets."
      />

      <Tabs defaultValue="models">
        <TabsList>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="env">Environment</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="mt-6 space-y-4">
          <ModelRow role="Architect" defaultModel="gpt-5" />
          <ModelRow role="Developer" defaultModel="claude-sonnet-4.5" />
          <ModelRow role="Reviewer" defaultModel="claude-opus-4" />
          <ModelRow role="Tester" defaultModel="gpt-5-mini" />
          <ModelRow role="Security" defaultModel="gemini-3-pro" />
          <ModelRow role="DevOps" defaultModel="gpt-5" />
          <ModelRow role="Project Manager" defaultModel="claude-haiku-4.5" />
        </TabsContent>

        <TabsContent value="appearance" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>
                ForgeOne is dark-first. Additional themes coming soon.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              {["Midnight", "Graphite", "Obsidian"].map((t, i) => (
                <button
                  key={t}
                  className={`surface p-4 text-left transition-colors ${i === 0 ? "border-primary" : ""}`}
                >
                  <div
                    className={`h-16 rounded-md mb-3 ${i === 0 ? "bg-gradient-primary" : i === 1 ? "bg-muted" : "bg-secondary"}`}
                  />
                  <p className="text-sm font-medium">{t}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {i === 0 ? "Active" : "Preview"}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <PrefRow label="Reduced motion" desc="Disable non-essential animations." />
              <PrefRow label="Compact mode" desc="Tighter spacing across the workspace." />
              <PrefRow label="Sound effects" desc="Play sounds on notable events." defaultChecked />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workspace" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5">
                <Label>Workspace name</Label>
                <Input defaultValue="Meridian Labs" />
              </div>
              <div className="grid gap-1.5">
                <Label>Default branch</Label>
                <Input defaultValue="main" />
              </div>
              <div className="grid gap-1.5">
                <Label>Timezone</Label>
                <Select defaultValue="utc">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="pst">America/Los_Angeles</SelectItem>
                    <SelectItem value="est">America/New_York</SelectItem>
                    <SelectItem value="cet">Europe/Berlin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => toast.success("Workspace saved")}>Save changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="env" className="mt-6">
          <EnvironmentVariables />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ModelRow({ role, defaultModel }: { role: string; defaultModel: string }) {
  return (
    <div className="surface p-4 flex items-center gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium">{role}</p>
        <p className="text-[11px] text-muted-foreground">
          Route this agent's inference to a specific model.
        </p>
      </div>
      <Select defaultValue={defaultModel}>
        <SelectTrigger className="w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="gpt-5">GPT-5</SelectItem>
          <SelectItem value="gpt-5-mini">GPT-5 Mini</SelectItem>
          <SelectItem value="claude-opus-4">Claude Opus 4</SelectItem>
          <SelectItem value="claude-sonnet-4.5">Claude Sonnet 4.5</SelectItem>
          <SelectItem value="claude-haiku-4.5">Claude Haiku 4.5</SelectItem>
          <SelectItem value="gemini-3-pro">Gemini 3 Pro</SelectItem>
          <SelectItem value="llama-4-405b">Llama 4 405B</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function PrefRow({
  label,
  desc,
  defaultChecked,
}: {
  label: string;
  desc: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

function EnvironmentVariables() {
  const [vars, setVars] = useState([
    { key: "DATABASE_URL", value: "postgres://***@db.forge.dev/meridian" },
    { key: "STRIPE_SECRET_KEY", value: "sk_live_***********************" },
    { key: "OPENAI_API_KEY", value: "sk-***********************" },
  ]);
  const [reveal, setReveal] = useState<Record<number, boolean>>({});

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Environment variables</CardTitle>
            <CardDescription>
              Injected into every agent run. Values are encrypted at rest.
            </CardDescription>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setVars([...vars, { key: "", value: "" }])}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {vars.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={v.key}
              onChange={(e) => {
                const n = [...vars];
                n[i].key = e.target.value;
                setVars(n);
              }}
              placeholder="KEY"
              className="w-56 font-mono text-xs"
            />
            <Input
              type={reveal[i] ? "text" : "password"}
              value={v.value}
              onChange={(e) => {
                const n = [...vars];
                n[i].value = e.target.value;
                setVars(n);
              }}
              placeholder="value"
              className="flex-1 font-mono text-xs"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setReveal({ ...reveal, [i]: !reveal[i] })}
            >
              {reveal[i] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVars(vars.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
