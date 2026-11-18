"use client";

export function DeleteButton({ action, id, confirmText, label = "Excluir" }: { action: (f: FormData) => Promise<void>; id: string; confirmText: string; label?: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn small danger">{label}</button>
    </form>
  );
}
