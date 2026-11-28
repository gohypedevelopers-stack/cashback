// Advisors: who customers can book, their languages/specialties and weekly hours (IST).

import { useMemo, useState } from "react";
import { Clock, Languages, Mail, Pencil, Phone, RefreshCw, Sparkles, UserPlus, UsersRound } from "lucide-react";
import { aiConsole } from "@/lib/aiAssistantApi";
import { useToast } from "@/components/ui/ToastContext";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  SelectInput,
  Skeleton,
  TextInput,
  Toggle,
  cx,
} from "../ui";
import { useConsole } from "../lib/ConsoleContext";
import { usePoll } from "../lib/hooks";
import {
  DEFAULT_WORKING_HOURS,
  WEEK_DAYS,
  asArray,
  errorMessage,
  normalizeWorkingHours,
  parseList,
  sortWorkingHours,
  summarizeWorkingHours,
  validateWorkingHours,
  weeklyHoursTotal,
} from "../lib/consoleFormat";
import WorkingHoursEditor from "./WorkingHoursEditor";

const SLOT_OPTIONS = [15, 20, 30, 45, 60];
const DAY_START = 7 * 60;
const DAY_END = 22 * 60;

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

function WeekTimeline({ hours }) {
  const normalized = normalizeWorkingHours(hours);
  const span = DAY_END - DAY_START;
  return (
    <div className="space-y-1" aria-hidden="true">
      {WEEK_DAYS.map((day) => (
        <div key={day.key} className="flex items-center gap-2">
          <span className="w-7 text-[10px] font-semibold text-slate-400">{day.short}</span>
          <span className="relative h-2 flex-1 rounded-full bg-slate-100">
            {normalized[day.key].map(([start, end], index) => {
              const a = toMinutes(start);
              const b = toMinutes(end);
              if (a === null || b === null || b <= a) return null;
              const left = ((Math.max(a, DAY_START) - DAY_START) / span) * 100;
              const width = ((Math.min(b, DAY_END) - Math.max(a, DAY_START)) / span) * 100;
              return (
                <span
                  key={index}
                  className="absolute top-0 h-2 rounded-full bg-emerald-500"
                  style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
                />
              );
            })}
          </span>
        </div>
      ))}
      <div className="flex justify-between pl-9 text-[9px] font-medium text-slate-300">
        <span>7 am</span>
        <span>2:30 pm</span>
        <span>10 pm</span>
      </div>
    </div>
  );
}

function AdvisorForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [languages, setLanguages] = useState(asArray(initial?.languages).join(", ") || (initial ? "" : "English, Hindi"));
  const [specialties, setSpecialties] = useState(asArray(initial?.specialties).join(", "));
  const [slotMinutes, setSlotMinutes] = useState(Number(initial?.slotMinutes) || 30);
  const [hours, setHours] = useState(() => normalizeWorkingHours(initial?.workingHours || DEFAULT_WORKING_HOURS));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (name.trim().length < 2) next.name = "Enter the advisor's name.";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "That email doesn't look right.";
    const hourErrors = validateWorkingHours(hours);
    if (Object.keys(hourErrors).length) next.hours = hourErrors;
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    await onSubmit({
      name: name.trim(),
      title: title.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      languages: parseList(languages),
      specialties: parseList(specialties),
      slotMinutes: Number(slotMinutes),
      workingHours: sortWorkingHours(hours),
    });
    setSaving(false);
  };

  return (
    <form id="advisor-form" onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="advisor-name" error={errors.name}>
          <TextInput
            id="advisor-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Priya Sharma"
            data-autofocus
            invalid={Boolean(errors.name)}
          />
        </Field>
        <Field label="Title" htmlFor="advisor-title" optional>
          <TextInput
            id="advisor-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Senior Wealth Advisor"
          />
        </Field>
        <Field label="Email" htmlFor="advisor-email" optional error={errors.email} hint="Booking notifications go here.">
          <TextInput
            id="advisor-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="priya@example.com"
            invalid={Boolean(errors.email)}
          />
        </Field>
        <Field label="Phone" htmlFor="advisor-phone" optional>
          <TextInput
            id="advisor-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+91 98xxxxxx10"
          />
        </Field>
        <Field label="Languages" htmlFor="advisor-languages" hint="Comma-separated.">
          <TextInput
            id="advisor-languages"
            value={languages}
            onChange={(event) => setLanguages(event.target.value)}
            placeholder="English, Hindi"
          />
        </Field>
        <Field label="Specialties" htmlFor="advisor-specialties" optional hint="Comma-separated.">
          <TextInput
            id="advisor-specialties"
            value={specialties}
            onChange={(event) => setSpecialties(event.target.value)}
            placeholder="Retirement, Tax planning, SIPs"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-700">Weekly working hours</p>
          <p className="text-xs text-slate-500">Customers are only offered slots inside these hours (IST).</p>
        </div>
        <Field label="Slot length" htmlFor="advisor-slot" className="w-36">
          <SelectInput id="advisor-slot" size="sm" value={slotMinutes} onChange={(event) => setSlotMinutes(Number(event.target.value))}>
            {SLOT_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <WorkingHoursEditor value={hours} onChange={setHours} errors={errors.hours || {}} />
      {errors.hours && <p className="text-xs font-medium text-rose-600">Fix the highlighted days before saving.</p>}

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" size="sm" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function AdvisorCard({ advisor, busy, onToggle, onSave }) {
  const [editing, setEditing] = useState(false);
  const active = advisor.active !== false;
  const languages = asArray(advisor.languages);
  const specialties = asArray(advisor.specialties);
  const hoursPerWeek = weeklyHoursTotal(normalizeWorkingHours(advisor.workingHours));

  if (editing) {
    return (
      <Card className="p-4 ring-2 ring-emerald-500/30 lg:col-span-2">
        <div className="mb-4 flex items-center gap-3">
          <Avatar name={advisor.name} seed={advisor.id} size="lg" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Edit {advisor.name}</p>
            <p className="text-xs text-slate-500">Changes apply to slots offered from the next customer message.</p>
          </div>
        </div>
        <AdvisorForm
          initial={advisor}
          submitLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSubmit={async (patch) => {
            const ok = await onSave(advisor, patch);
            if (ok) setEditing(false);
          }}
        />
      </Card>
    );
  }

  return (
    <Card className={cx("flex flex-col p-4 transition-opacity", !active && "opacity-70")}>
      <div className="flex items-start gap-3">
        <Avatar name={advisor.name} seed={advisor.id} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-slate-900">{advisor.name}</h3>
            {active ? <Badge tone="emerald">Bookable</Badge> : <Badge tone="slate">Inactive</Badge>}
          </div>
          {advisor.title && <p className="truncate text-xs text-slate-500">{advisor.title}</p>}
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
            {advisor.email && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <Mail className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{advisor.email}</span>
              </span>
            )}
            {advisor.phone && (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3" aria-hidden="true" />
                {advisor.phone}
              </span>
            )}
          </div>
        </div>
        <Toggle
          checked={active}
          disabled={busy}
          onChange={(next) => onToggle(advisor, next)}
          label={active ? `Pause bookings for ${advisor.name}` : `Make ${advisor.name} bookable`}
        />
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Languages className="size-3.5 text-slate-400" aria-label="Languages" />
          {languages.length ? (
            languages.map((language) => (
              <Badge key={language} tone="white">
                {language}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-slate-400">No languages set</span>
          )}
        </div>
        {specialties.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Sparkles className="size-3.5 text-slate-400" aria-label="Specialties" />
            {specialties.map((item) => (
              <Badge key={item} tone="sky">
                {item}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg bg-slate-50/80 p-3 ring-1 ring-slate-100">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Clock className="size-3.5 text-slate-400" aria-hidden="true" />
            Working hours (IST)
          </p>
          <span className="text-[11px] text-slate-500">
            {Number(advisor.slotMinutes) || 30}-min slots · {hoursPerWeek % 1 ? hoursPerWeek.toFixed(1) : hoursPerWeek} h/week
          </span>
        </div>
        <WeekTimeline hours={advisor.workingHours} />
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{summarizeWorkingHours(advisor.workingHours)}</p>
      </div>

      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
          Edit details & hours
        </Button>
      </div>
    </Card>
  );
}

export default function AdvisorsView() {
  const { tenantKey, tenant } = useConsole();
  const { success: toastSuccess, error: toastError } = useToast();
  const advisors = usePoll(() => aiConsole.listAdvisors({ tenantKey }), { key: `advisors:${tenantKey}` });
  const { setData } = advisors;
  const [adding, setAdding] = useState(false);
  const [busyIds, setBusyIds] = useState({});

  const items = useMemo(() => (Array.isArray(advisors.data?.items) ? advisors.data.items : []), [advisors.data]);
  const activeCount = items.filter((advisor) => advisor.active !== false).length;
  const bookableHours = items
    .filter((advisor) => advisor.active !== false)
    .reduce((sum, advisor) => sum + weeklyHoursTotal(normalizeWorkingHours(advisor.workingHours)), 0);

  const replace = (advisor) =>
    setData((current) => ({
      ...(current || {}),
      items: (current?.items || []).map((item) => (item.id === advisor.id ? { ...item, ...advisor } : item)),
    }));

  const create = async (fields) => {
    try {
      const res = await aiConsole.createAdvisor({ tenantKey, active: true, ...fields });
      if (res?.advisor) setData((current) => ({ ...(current || {}), items: [...(current?.items || []), res.advisor] }));
      else advisors.refresh();
      toastSuccess("Advisor added", `${fields.name} can now be booked by the assistant.`);
      setAdding(false);
    } catch (err) {
      toastError("Couldn't add the advisor", errorMessage(err));
    }
  };

  const save = async (advisor, patch) => {
    try {
      const res = await aiConsole.updateAdvisor(advisor.id, patch);
      replace(res?.advisor || { ...advisor, ...patch });
      toastSuccess("Advisor updated", advisor.name);
      return true;
    } catch (err) {
      toastError("Couldn't save the advisor", errorMessage(err));
      return false;
    }
  };

  const toggle = async (advisor, active) => {
    setBusyIds((current) => ({ ...current, [advisor.id]: true }));
    replace({ ...advisor, active });
    try {
      const res = await aiConsole.updateAdvisor(advisor.id, { active });
      if (res?.advisor) replace(res.advisor);
      toastSuccess(
        active ? `${advisor.name} is bookable` : `${advisor.name} is paused`,
        active ? "The assistant will offer their open slots." : "The assistant won't offer new slots with them.",
      );
    } catch (err) {
      replace({ ...advisor, active: !active });
      toastError("Couldn't update the advisor", errorMessage(err));
    } finally {
      setBusyIds((current) => {
        const next = { ...current };
        delete next[advisor.id];
        return next;
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-350 space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{tenant?.booking?.teamName || "Advisor team"}</p>
          <p className="text-xs text-slate-500">
            {items.length
              ? `${activeCount} of ${items.length} bookable · ${bookableHours % 1 ? bookableHours.toFixed(1) : bookableHours} bookable hours per week`
              : "Advisors the assistant can book calls with"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" icon={RefreshCw} onClick={advisors.refresh}>
            Refresh
          </Button>
          <Button size="sm" variant="primary" icon={UserPlus} onClick={() => setAdding(true)}>
            Add advisor
          </Button>
        </div>
      </div>

      {advisors.error && !advisors.data ? (
        <Card>
          <ErrorState title="Couldn't load advisors" error={advisors.error} onRetry={advisors.refresh} />
        </Card>
      ) : !advisors.data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((index) => (
            <Card key={index} className="space-y-3 p-4">
              <div className="flex gap-3">
                <Skeleton className="size-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-28" />
            </Card>
          ))}
        </div>
      ) : !items.length ? (
        <Card>
          <EmptyState
            icon={UsersRound}
            title="No advisors yet"
            description="Add an advisor with working hours so the assistant can offer customers real call slots."
            action={
              <Button size="sm" variant="primary" icon={UserPlus} onClick={() => setAdding(true)}>
                Add advisor
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((advisor) => (
            <AdvisorCard key={advisor.id} advisor={advisor} busy={Boolean(busyIds[advisor.id])} onToggle={toggle} onSave={save} />
          ))}
        </div>
      )}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add advisor"
        description="They become bookable immediately — the assistant offers their open slots to ready-to-invest customers."
        icon={UserPlus}
        size="xl"
      >
        <AdvisorForm submitLabel="Add advisor" onSubmit={create} onCancel={() => setAdding(false)} />
      </Modal>
    </div>
  );
}
