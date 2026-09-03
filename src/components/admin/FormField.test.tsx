// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  FormField,
  FORM_LABEL_CLASS,
  FORM_INPUT_CLASS,
} from "./FormField";

describe("FormField", () => {
  it("renders the label text", () => {
    render(
      <FormField id="title" label="Título *">
        <input id="title" className={FORM_INPUT_CLASS} />
      </FormField>,
    );
    expect(screen.getByText("Título *")).toBeInTheDocument();
  });

  it("wires htmlFor to the child control id", () => {
    render(
      <FormField id="title" label="Título *">
        <input id="title" className={FORM_INPUT_CLASS} />
      </FormField>,
    );
    const input = screen.getByLabelText("Título *");
    expect(input).toHaveAttribute("id", "title");
  });

  it("applies FORM_LABEL_CLASS to the label", () => {
    render(
      <FormField id="name" label="Nome">
        <input id="name" />
      </FormField>,
    );
    expect(screen.getByText("Nome").className).toBe(FORM_LABEL_CLASS);
  });

  it("keeps FORM_INPUT_CLASS on the rendered child control", () => {
    render(
      <FormField id="name" label="Nome">
        <input id="name" className={FORM_INPUT_CLASS} />
      </FormField>,
    );
    expect(screen.getByLabelText("Nome").className).toBe(FORM_INPUT_CLASS);
  });

  it("preserves the exact admin class strings", () => {
    expect(FORM_LABEL_CLASS).toBe(
      "block text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-1.5",
    );
    expect(FORM_INPUT_CLASS).toBe(
      "w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 hover:border-slate-700 focus:border-brand-red focus:outline-none",
    );
  });
});
