"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, UserCircle2 } from "lucide-react";
import { cn, initials } from "@/lib/utils";

interface Member {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Props {
  members: Member[];
  value: string;
  onChange: (id: string) => void;
}

function Avatar({ member, size = "w-5 h-5" }: { member?: Member; size?: string }) {
  if (!member) {
    return (
      <div className={cn(size, "rounded-full bg-background border border-border flex items-center justify-center shrink-0")}>
        <UserCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className={cn(size, "rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center overflow-hidden shrink-0")}>
      {member.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.image} alt="" className="w-full h-full object-cover" />
      ) : (
        initials(member.name || member.email)
      )}
    </div>
  );
}

export function AssigneeSelect({ members, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = members.find((m) => m.id === value);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-9 flex items-center gap-2 bg-background border border-border rounded-lg px-2.5 text-sm hover:border-primary/40 transition-colors"
      >
        <Avatar member={active} />
        <span className={cn("flex-1 text-left truncate", !active && "text-muted-foreground")}>
          {active ? active.name || active.email : "Ninguém"}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-card border border-border rounded-xl shadow-xl py-1 max-h-56 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary/10 transition-colors"
          >
            <Avatar />
            <span className="flex-1 text-left text-muted-foreground">Ninguém</span>
            {!value && <Check className="w-3.5 h-3.5 text-primary" />}
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onChange(m.id); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary/10 transition-colors"
            >
              <Avatar member={m} />
              <span className="flex-1 text-left truncate">{m.name || m.email}</span>
              {value === m.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
