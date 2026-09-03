// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  WorkspacePackageLibrary,
  PKG_DRAG_MIME,
} from "./WorkspacePackageLibrary";
import type { ActivePackageOption } from "../../query";

const dict = {
  title: "Packages",
  searchPlaceholder: "Search packages...",
  empty: "No packages match.",
  allAdded: "All packages added.",
  dragHint: "Drag onto the canvas",
  yoursLabel: "Your packages",
  othersLabel: "All packages",
  pendingTag: "pending",
};

const packages: ActivePackageOption[] = [
  { id: "p-1", name: "Colligo", slug: "colligo", owned: true, pending: true },
  { id: "p-2", name: "Janus ORM", slug: "janus", owned: false, pending: false },
  { id: "p-3", name: "DataEngine", slug: "dataengine", owned: false, pending: false },
];

describe("WorkspacePackageLibrary", () => {
  it("lists available packages as draggable cards", () => {
    render(
      <WorkspacePackageLibrary
        packages={packages}
        addedPackageIds={new Set()}
        dict={dict}
      />,
    );
    expect(screen.getByText("Colligo")).toBeInTheDocument();
    expect(screen.getByText("Janus ORM")).toBeInTheDocument();
    expect(screen.getByText("DataEngine")).toBeInTheDocument();
  });

  it("hides packages already in the workspace", () => {
    render(
      <WorkspacePackageLibrary
        packages={packages}
        addedPackageIds={new Set(["p-2"])}
        dict={dict}
      />,
    );
    expect(screen.getByText("Colligo")).toBeInTheDocument();
    expect(screen.queryByText("Janus ORM")).toBeNull();
  });

  it("filters by the search query (name or slug)", () => {
    render(
      <WorkspacePackageLibrary
        packages={packages}
        addedPackageIds={new Set()}
        dict={dict}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText(dict.searchPlaceholder), {
      target: { value: "janus" },
    });
    expect(screen.getByText("Janus ORM")).toBeInTheDocument();
    expect(screen.queryByText("Colligo")).toBeNull();
  });

  it("shows the all-added message when every package is in the workspace", () => {
    render(
      <WorkspacePackageLibrary
        packages={packages}
        addedPackageIds={new Set(["p-1", "p-2", "p-3"])}
        dict={dict}
      />,
    );
    expect(screen.getByText(dict.allAdded)).toBeInTheDocument();
  });

  it("sets the package id on the drag payload", () => {
    render(
      <WorkspacePackageLibrary
        packages={[packages[0]]}
        addedPackageIds={new Set()}
        dict={dict}
      />,
    );
    const card = screen.getByText("Colligo").closest("[draggable]")!;
    const setData = vi.fn();
    fireEvent.dragStart(card, {
      dataTransfer: { setData, effectAllowed: "" },
    });
    expect(setData).toHaveBeenCalledWith(PKG_DRAG_MIME, "p-1");
  });

  it("groups owned packages under 'yours' and the rest under 'others'", () => {
    render(
      <WorkspacePackageLibrary
        packages={packages}
        addedPackageIds={new Set()}
        dict={dict}
      />,
    );
    // Both section headers render with their counts.
    expect(screen.getByText(dict.yoursLabel)).toBeInTheDocument();
    expect(screen.getByText(dict.othersLabel)).toBeInTheDocument();
    expect(screen.getByText("(1)")).toBeInTheDocument(); // yours: Colligo
    expect(screen.getByText("(2)")).toBeInTheDocument(); // others: Janus + DataEngine
  });

  it("tags a pending package and not an active one", () => {
    render(
      <WorkspacePackageLibrary
        packages={packages}
        addedPackageIds={new Set()}
        dict={dict}
      />,
    );
    // p-1 is pending → exactly one pending tag.
    expect(screen.getAllByText(dict.pendingTag)).toHaveLength(1);
  });
});
