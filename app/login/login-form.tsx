"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

const initial: LoginState = {};

export function LoginForm({ roomRequired = false }: { roomRequired?: boolean }) {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-slate-700">
          Display name
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          autoComplete="username"
          placeholder="e.g. Berker"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
        />
      </div>
      <div>
        <label htmlFor="pin" className="mb-1 block text-sm font-medium text-slate-700">
          PIN <span className="text-slate-400">(required, 4–8 digits)</span>
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          required
          minLength={4}
          maxLength={8}
          pattern="\d{4,8}"
          autoComplete="current-password"
          placeholder="••••"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
        />
      </div>
      {roomRequired && (
        <div>
          <label htmlFor="roomPassword" className="mb-1 block text-sm font-medium text-slate-700">
            Room key
          </label>
          <input
            id="roomPassword"
            name="roomPassword"
            type="text"
            required
            autoComplete="off"
            placeholder="shared key from the organiser"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500"
          />
        </div>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Enter the game"}
      </button>
    </form>
  );
}
