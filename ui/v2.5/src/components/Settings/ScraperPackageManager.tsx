import React, { useEffect, useState, useMemo } from "react";
import * as GQL from "src/core/generated-graphql";
import {
  evictQueries,
  getClient,
  queryAvailableScraperPackages,
  useInstallScraperPackages,
  useInstalledScraperPackages,
  useInstalledScraperPackagesStatus,
  useUninstallScraperPackages,
  useUpdateScraperPackages,
} from "src/core/StashService";
import { useMonitorJob } from "src/utils/job";
import {
  AvailablePackages,
  InstalledPackages,
} from "../Shared/PackageManager/PackageManager";
import { useSettings } from "./context";
import { LoadingIndicator } from "../Shared/LoadingIndicator";
import { SettingSection } from "./SettingSection";

const impactedPackageChangeQueries = [
  GQL.ListPerformerScrapersDocument,
  GQL.ListSceneScrapersDocument,
  GQL.ListMovieScrapersDocument,
  GQL.InstalledScraperPackagesDocument,
  GQL.InstalledScraperPackagesStatusDocument,
];

export const InstalledScraperPackages: React.FC = () => {
  const [loadUpgrades, setLoadUpgrades] = useState(false);
  const [jobID, setJobID] = useState<string>();
  const { job } = useMonitorJob(jobID, () => onPackageChanges());

  const { data: installedScrapers, refetch: refetchPackages1 } =
    useInstalledScraperPackages({
      skip: loadUpgrades,
    });

  const {
    data: withStatus,
    refetch: refetchPackages2,
    loading: statusLoading,
  } = useInstalledScraperPackagesStatus({
    skip: !loadUpgrades,
  });

  const [updatePackages] = useUpdateScraperPackages();
  const [uninstallPackages] = useUninstallScraperPackages();

  async function onUpdatePackages(packages: GQL.PackageSpecInput[]) {
    const r = await updatePackages({
      variables: {
        packages,
      },
    });

    setJobID(r.data?.updatePackages);
  }

  async function onUninstallPackages(packages: string[]) {
    const r = await uninstallPackages({
      variables: {
        packages,
      },
    });

    setJobID(r.data?.uninstallPackages);
  }

  function refetchPackages() {
    refetchPackages1();
    refetchPackages2();
  }

  function onPackageChanges() {
    // job is complete, refresh all local data
    const ac = getClient();
    evictQueries(ac.cache, impactedPackageChangeQueries);
  }

  function onCheckForUpdates() {
    if (!loadUpgrades) {
      setLoadUpgrades(true);
    } else {
      refetchPackages();
    }
  }

  const installedPackages = useMemo(() => {
    if (withStatus?.installedPackages) {
      return withStatus.installedPackages;
    }

    return installedScrapers?.installedPackages ?? [];
  }, [installedScrapers, withStatus]);

  const loading = !!job || statusLoading;

  return (
    <SettingSection headingID="config.scraping.installed_scrapers">
      <div className="package-manager">
        <InstalledPackages
          loading={loading}
          packages={installedPackages}
          onCheckForUpdates={onCheckForUpdates}
          onUpdatePackages={(packages) =>
            onUpdatePackages(
              packages.map((p) => ({
                id: p.id,
                sourceURL: p.upgrade!.sourceURL,
              }))
            )
          }
          onUninstallPackages={(packages) =>
            onUninstallPackages(packages.map((p) => p.id))
          }
          updatesLoaded={loadUpgrades}
        />
      </div>
    </SettingSection>
  );
};

export const AvailableScraperPackages: React.FC = () => {
  const { general, loading: configLoading, error, saveGeneral } = useSettings();

  const [sourcePackages, setSourcePackages] = useState<
    Record<string, GQL.Package[]>
  >({});
  const [sources, setSources] = useState<GQL.PackageSource[]>();
  const [sourcesLoaded, setSourcesLoaded] = useState<Record<string, boolean>>(
    {}
  );
  const [jobID, setJobID] = useState<string>();
  const { job } = useMonitorJob(jobID, () => onPackageChanges());

  const [installPackages] = useInstallScraperPackages();

  async function onInstallPackages(packages: GQL.PackageSpecInput[]) {
    const r = await installPackages({
      variables: {
        packages,
      },
    });

    setJobID(r.data?.installPackages);
  }

  function onPackageChanges() {
    // job is complete, refresh all local data
    const ac = getClient();
    evictQueries(ac.cache, impactedPackageChangeQueries);
  }

  useEffect(() => {
    if (!sources && !configLoading && general.scraperPackageSources) {
      setSources(general.scraperPackageSources);
    }
  }, [sources, configLoading, general.scraperPackageSources]);

  async function loadSource(source: string) {
    if (sourcesLoaded[source]) {
      return;
    }

    const { data } = await queryAvailableScraperPackages(source);

    setSourcePackages((prev) => {
      return {
        ...prev,
        [source]: data.availablePackages,
      };
    });

    setSourcesLoaded((prev) => {
      return {
        ...prev,
        [source]: true,
      };
    });
  }

  function addSource(source: GQL.PackageSource) {
    saveGeneral({
      scraperPackageSources: [...(general.scraperPackageSources ?? []), source],
    });

    setSources((prev) => {
      return [...(prev ?? []), source];
    });
  }

  function editSource(existing: GQL.PackageSource, changed: GQL.PackageSource) {
    saveGeneral({
      scraperPackageSources: general.scraperPackageSources?.map((s) =>
        s.url === existing.url ? changed : s
      ),
    });

    setSources((prev) => {
      return prev?.map((s) => (s.url === existing.url ? changed : s));
    });

    if (existing.url !== changed.url) {
      // wipe the cache for the old source
      setSourcePackages((prev) => {
        const next = { ...prev };
        delete next[existing.url];
        return next;
      });
      setSourcesLoaded((prev) => {
        const next = { ...prev };
        delete next[existing.url];
        return next;
      });
    }
  }

  function deleteSource(source: GQL.PackageSource) {
    saveGeneral({
      scraperPackageSources: general.scraperPackageSources?.filter(
        (s) => s.url !== source.url
      ),
    });

    setSources((prev) => {
      return prev?.filter((s) => s.url !== source.url);
    });

    // wipe the cache for the deleted source
    setSourcePackages((prev) => {
      const next = { ...prev };
      delete next[source.url];
      return next;
    });
    setSourcesLoaded((prev) => {
      const next = { ...prev };
      delete next[source.url];
      return next;
    });
  }

  if (error) return <h1>{error.message}</h1>;
  if (configLoading) return <LoadingIndicator />;

  const loading = !!job;

  return (
    <SettingSection headingID="config.scraping.available_scrapers">
      <div className="package-manager">
        <AvailablePackages
          loading={loading}
          onInstallPackages={onInstallPackages}
          loadSource={(source) => loadSource(source)}
          sources={sources ?? []}
          packages={sourcePackages}
          addSource={addSource}
          editSource={editSource}
          deleteSource={deleteSource}
        />
      </div>
    </SettingSection>
  );
};
