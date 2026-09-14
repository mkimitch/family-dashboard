# Daymark rebrand checklist

This document tracks the rebrand from **Family Dashboard** to **Daymark**.

## Phase 1: Product identity

- [x] Rename the product in the README.
- [x] Rename the package to `daymark`.
- [x] Update the document title, description, and application name.
- [x] Update the web app manifest.
- [x] Replace the default Svelte favicon with a Daymark mark.
- [x] Rename the internal `FD Sans` font alias to `Daymark Sans`.
- [x] Preserve existing deployment and database identifiers for compatibility.

## Phase 2: Repository identity

- [ ] Merge the product-identity pull request.
- [ ] Rename the GitHub repository from `family-dashboard` to `daymark`.
- [ ] Update local remotes and any repository-dependent integrations.
- [ ] Update portfolio, resume, LinkedIn, and other links to the new repository URL.
- [ ] Update the GitHub repository description and social preview image.
- [ ] Verify old repository URLs redirect as expected.

## Phase 3: Production identifiers

Perform these as a coordinated deployment change, not as part of the product-facing rename.

- [ ] Inspect and record the current service, deployment, environment, and database configuration.
- [ ] Create and verify a recoverable database backup.
- [ ] Decide whether to retain legacy internal identifiers or rename them.
- [ ] Update absolute paths and service references together.
- [ ] Deploy, restart, and inspect service health and logs.
- [ ] Verify the kiosk UI, weather, calendar, school menu, countdowns, photos, and host status.
- [ ] Remove legacy identifiers only after the new deployment has been verified.

## Phase 4: Visual and portfolio polish

- [ ] Decide whether the initial sunrise/day-marker icon is the permanent mark.
- [ ] Create production PNG icons for common PWA sizes and Apple touch icons.
- [ ] Capture current portrait and landscape screenshots with private family data removed.
- [ ] Add a concise architecture diagram and a resume-friendly project summary.
- [ ] Add a public demo or sanitized preview if practical.
