import React, { useState, useEffect, useCallback, useMemo } from "react";
import cx from "classnames";
import { Badge, Button, Col, Form, Row } from "react-bootstrap";
import { FormattedMessage, useIntl } from "react-intl";
import uniq from "lodash-es/uniq";
import { blobToBase64 } from "base64-blob";
import { distance } from "src/utils/hamming";
import { faCheckCircle } from "@fortawesome/free-regular-svg-icons";
import {
  faPlus,
  faTriangleExclamation,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import * as GQL from "src/core/generated-graphql";
import { HoverPopover } from "src/components/Shared/HoverPopover";
import { Icon } from "src/components/Shared/Icon";
import { SuccessIcon } from "src/components/Shared/SuccessIcon";
import { LoadingIndicator } from "src/components/Shared/LoadingIndicator";
import { TagSelect } from "src/components/Shared/Select";
import { TruncatedText } from "src/components/Shared/TruncatedText";
import { OperationButton } from "src/components/Shared/OperationButton";
import * as FormUtils from "src/utils/form";
import { stringToGender } from "src/utils/gender";
import { IScrapedScene, useTagger } from "../context";
import { OptionalField } from "../IncludeButton";
import { SceneTaggerModalsState } from "./sceneTaggerModals";
import PerformerResult from "./PerformerResult";
import StudioResult from "./StudioResult";
import { useInitialState } from "src/hooks/state";
import { getStashboxBase } from "src/utils/stashbox";
import { ExternalLink } from "src/components/Shared/ExternalLink";

const getDurationIcon = (matchPercentage: number) => {
  if (matchPercentage > 65)
    return (
      <Icon className="SceneTaggerIcon text-success" icon={faCheckCircle} />
    );
  if (matchPercentage > 35)
    return (
      <Icon
        className="SceneTaggerIcon text-warning"
        icon={faTriangleExclamation}
      />
    );

  return <Icon className="SceneTaggerIcon text-danger" icon={faXmark} />;
};

const getDurationStatus = (
  duration: GQL.Maybe<number> | undefined,
  fingerprints: GQL.Maybe<GQL.StashBoxFingerprint[]> | undefined,
  stashDuration: number | undefined | null
) => {
  if (!stashDuration) return "";

  const durations =
    fingerprints
      ?.map((f) => f.duration)
      .map((d) => Math.abs(d - stashDuration)) ?? [];

  if (!duration && durations.length === 0) return "";

  const matchCount = durations.filter((d) => d <= 5).length;

  let match;
  if (matchCount > 0)
    match = (
      <FormattedMessage
        id="component_tagger.results.fp_matches_multi"
        values={{ matchCount, durationsLength: durations.length }}
      />
    );
  else if (duration && Math.abs(duration - stashDuration) < 5)
    match = <FormattedMessage id="component_tagger.results.fp_matches" />;

  const matchPercentage = (matchCount / durations.length) * 100;

  if (match)
    return (
      <div className="font-weight-bold">
        {getDurationIcon(matchPercentage)}
        {match}
      </div>
    );

  let minDiff = Math.min(...durations);
  if (duration) {
    minDiff = Math.min(minDiff, Math.abs(duration - stashDuration));
  }

  return (
    <FormattedMessage
      id="component_tagger.results.duration_off"
      values={{ number: Math.floor(minDiff) }}
    />
  );
};

function matchPhashes(
  scenePhashes: Pick<GQL.Fingerprint, "type" | "value">[],
  fingerprints: GQL.StashBoxFingerprint[]
) {
  const phashes = fingerprints.filter((f) => f.algorithm === "PHASH");

  const matches: { [key: string]: number } = {};
  phashes.forEach((p) => {
    let bestMatch = -1;
    scenePhashes.forEach((fp) => {
      const d = distance(p.hash, fp.value);

      if (d <= 8 && (bestMatch === -1 || d < bestMatch)) {
        bestMatch = d;
      }
    });

    if (bestMatch !== -1) {
      matches[p.hash] = bestMatch;
    }
  });

  // convert to tuple and sort by distance descending
  const entries = Object.entries(matches);
  entries.sort((a, b) => {
    return a[1] - b[1];
  });

  return entries;
}

type SlimSceneFiles = GQL.SlimSceneDataFragment["files"];

const getFingerprintStatus = (
  fingerprints: GQL.Maybe<GQL.StashBoxFingerprint[]> | undefined,
  stashSceneFiles: SlimSceneFiles
) => {
  const checksumMatch = fingerprints?.some((f) =>
    stashSceneFiles.some((ff) =>
      ff.fingerprints.some(
        (fp) =>
          fp.value === f.hash && (fp.type === "oshash" || fp.type === "md5")
      )
    )
  );

  const allPhashes = stashSceneFiles.reduce(
    (pv: Pick<GQL.Fingerprint, "type" | "value">[], cv) => {
      return [...pv, ...cv.fingerprints.filter((f) => f.type === "phash")];
    },
    []
  );

  const phashMatches = matchPhashes(allPhashes, fingerprints ?? []);

  const phashList = (
    <div className="m-2">
      {phashMatches.map((fp: [string, number]) => {
        const hash = fp[0];
        const d = fp[1];
        return (
          <div key={hash}>
            <b>{hash}</b>
            {d === 0 ? ", Exact match" : `, distance ${d}`}
          </div>
        );
      })}
    </div>
  );

  if (checksumMatch || phashMatches.length > 0)
    return (
      <div>
        {phashMatches.length > 0 && (
          <div className="font-weight-bold">
            <SuccessIcon className="SceneTaggerIcon" />
            <HoverPopover
              placement="bottom"
              content={phashList}
              className="PHashPopover"
            >
              {phashMatches.length > 1 ? (
                <FormattedMessage
                  id="component_tagger.results.phash_matches"
                  values={{
                    count: phashMatches.length,
                  }}
                />
              ) : (
                <FormattedMessage
                  id="component_tagger.results.hash_matches"
                  values={{
                    hash_type: <FormattedMessage id="media_info.phash" />,
                  }}
                />
              )}
            </HoverPopover>
          </div>
        )}
        {checksumMatch && (
          <div className="font-weight-bold">
            <SuccessIcon className="mr-2" />
            <FormattedMessage
              id="component_tagger.results.hash_matches"
              values={{
                hash_type: <FormattedMessage id="media_info.checksum" />,
              }}
            />
          </div>
        )}
      </div>
    );
};

interface IStashSearchResultProps {
  scene: IScrapedScene;
  stashScene: GQL.SlimSceneDataFragment;
  index: number;
  isActive: boolean;
}

// constants to get around dot-notation eslint rule
interface IExcludedFields {
  cover_image: boolean;
  title: boolean;
  date: boolean;
  url: boolean;
  details: boolean;
  studio: boolean;
  stash_ids: boolean;
  code: boolean;
  director: boolean;
}

const defaultExcludedFields: IExcludedFields = {
  cover_image: false,
  title: false,
  date: false,
  url: false,
  details: false,
  studio: false,
  stash_ids: false,
  code: false,
  director: false,
};

const StashSearchResult: React.FC<IStashSearchResultProps> = ({
  scene,
  stashScene,
  index,
  isActive,
}) => {
  const intl = useIntl();

  const {
    config,
    createNewTag,
    createNewPerformer,
    linkPerformer,
    createNewStudio,
    updateStudio,
    linkStudio,
    resolveScene,
    currentSource,
    saveScene,
  } = useTagger();

  const performers = useMemo(
    () =>
      scene.performers?.filter((p) => {
        if (!config.showMales) {
          return (
            !p.gender || stringToGender(p.gender, true) !== GQL.GenderEnum.Male
          );
        }
        return true;
      }) ?? [],
    [config.showMales, scene.performers]
  );

  const { createPerformerModal, createStudioModal } = React.useContext(
    SceneTaggerModalsState
  );

  const getInitialTags = useCallback(() => {
    const stashSceneTags = stashScene.tags.map((t) => t.id);
    if (!config.setTags) {
      return stashSceneTags;
    }

    const newTags =
      scene.tags?.filter((t) => t.stored_id).map((t) => t.stored_id!) ?? [];

    if (config.tagOperation === "overwrite") {
      return newTags;
    }
    if (config.tagOperation === "merge") {
      return uniq(stashSceneTags.concat(newTags));
    }

    throw new Error("unexpected tagOperation");
  }, [stashScene, scene, config.setTags, config.tagOperation]);

  const getInitialPerformers = useCallback(() => {
    return performers.map((p) => p.stored_id ?? undefined);
  }, [performers]);

  const getInitialStudio = useCallback(() => {
    return scene.studio?.stored_id ?? stashScene.studio?.id;
  }, [stashScene, scene]);

  const [loading, setLoading] = useState(false);
  const [excludedFields, setExcludedFields] = useState<IExcludedFields>(
    defaultExcludedFields
  );
  const [tagIDs, setTagIDs, setInitialTagIDs] = useInitialState<string[]>(
    getInitialTags()
  );

  // map of original performer to id
  const [performerIDs, setPerformerIDs] = useState<(string | undefined)[]>(
    getInitialPerformers()
  );

  const [studioID, setStudioID] = useState<string | undefined>(
    getInitialStudio()
  );

  useEffect(() => {
    setInitialTagIDs(getInitialTags());
  }, [getInitialTags, setInitialTagIDs]);

  useEffect(() => {
    setPerformerIDs(getInitialPerformers());
  }, [getInitialPerformers]);

  useEffect(() => {
    setStudioID(getInitialStudio());
  }, [getInitialStudio]);

  useEffect(() => {
    async function doResolveScene() {
      try {
        setLoading(true);
        await resolveScene(stashScene.id, index, scene);
      } finally {
        setLoading(false);
      }
    }

    if (isActive && !loading && !scene.resolved) {
      doResolveScene();
    }
  }, [isActive, loading, stashScene, index, resolveScene, scene]);

  const stashBoxBaseURL = currentSource?.sourceInput.stash_box_endpoint
    ? getStashboxBase(currentSource.sourceInput.stash_box_endpoint)
    : undefined;
  const stashBoxURL = useMemo(() => {
    if (stashBoxBaseURL) {
      return `${stashBoxBaseURL}scenes/${scene.remote_site_id}`;
    }
  }, [scene, stashBoxBaseURL]);

  const setExcludedFieldsPartial = useCallback(
    (partial: Partial<IExcludedFields>) => {
      setExcludedFields((current) => ({
        ...current,
        ...partial,
      }));
    },
    []
  );

  async function handleSave() {
    const excludedFieldList = Object.keys(excludedFields).filter(
      (f) => (excludedFields as unknown as Record<string, boolean>)[f]
    );

    function resolveField<T>(field: string, stashField: T, remoteField: T) {
      // #2452 - don't overwrite fields that are already set if the remote field is empty
      const remoteFieldIsNull =
        remoteField === null || remoteField === undefined;
      if (excludedFieldList.includes(field) || remoteFieldIsNull) {
        return stashField;
      }

      return remoteField;
    }

    let imgData;
    if (!excludedFields.cover_image && config.setCoverImage) {
      const imgurl = scene.image;
      if (imgurl) {
        const img = await fetch(imgurl, {
          mode: "cors",
          cache: "no-store",
        });
        if (img.status === 200) {
          const blob = await img.blob();
          // Sanity check on image size since bad images will fail
          if (blob.size > 10000) imgData = await blobToBase64(blob);
        }
      }
    }

    const filteredPerformerIDs = performerIDs.filter(
      (id) => id !== undefined
    ) as string[];

    const sceneCreateInput: GQL.SceneUpdateInput = {
      id: stashScene.id ?? "",
      title: resolveField("title", stashScene.title, scene.title),
      details: resolveField("details", stashScene.details, scene.details),
      date: resolveField("date", stashScene.date, scene.date),
      performer_ids: uniq(
        stashScene.performers.map((p) => p.id).concat(filteredPerformerIDs)
      ),
      studio_id: studioID,
      cover_image: resolveField("cover_image", undefined, imgData),
      tag_ids: tagIDs,
      stash_ids: stashScene.stash_ids ?? [],
      code: resolveField("code", stashScene.code, scene.code),
      director: resolveField("director", stashScene.director, scene.director),
    };

    const includeUrl = !excludedFieldList.includes("url");
    if (includeUrl && scene.urls) {
      sceneCreateInput.urls = uniq(stashScene.urls.concat(scene.urls));
    } else {
      sceneCreateInput.urls = stashScene.urls;
    }

    const includeStashID = !excludedFieldList.includes("stash_ids");
    if (
      includeStashID &&
      currentSource?.sourceInput.stash_box_endpoint &&
      scene.remote_site_id
    ) {
      sceneCreateInput.stash_ids = [
        ...(stashScene?.stash_ids
          .map((s) => {
            return {
              endpoint: s.endpoint,
              stash_id: s.stash_id,
            };
          })
          .filter(
            (s) => s.endpoint !== currentSource.sourceInput.stash_box_endpoint
          ) ?? []),
        {
          endpoint: currentSource.sourceInput.stash_box_endpoint,
          stash_id: scene.remote_site_id,
        },
      ];
    } else {
      // #2348 - don't include stash_ids if we're not setting them
      delete sceneCreateInput.stash_ids;
    }

    await saveScene(sceneCreateInput, includeStashID);
  }

  const coverImage = useMemo(() => {
    if (scene.image) {
      return (
        <div className="scene-image-container">
          <OptionalField
            disabled={!config.setCoverImage}
            exclude={excludedFields.cover_image || !config.setCoverImage}
            setExclude={(v) => setExcludedFieldsPartial({ cover_image: v })}
          >
            <img
              src={scene.image}
              alt=""
              className="align-self-center scene-image"
            />
          </OptionalField>
        </div>
      );
    }
  }, [
    scene.image,
    excludedFields,
    setExcludedFieldsPartial,
    config.setCoverImage,
  ]);

  const title = useMemo(() => {
    if (!scene.title) {
      return (
        <h4 className="text-muted">
          <FormattedMessage id="component_tagger.results.unnamed" />
        </h4>
      );
    }

    const url = scene.urls?.length ? scene.urls[0] : null;

    const sceneTitleEl = url ? (
      <ExternalLink className="scene-link" href={url}>
        <TruncatedText text={scene.title} />
      </ExternalLink>
    ) : (
      <TruncatedText text={scene.title} />
    );

    return (
      <h4>
        <OptionalField
          exclude={excludedFields.title}
          setExclude={(v) => setExcludedFieldsPartial({ title: v })}
        >
          {sceneTitleEl}
        </OptionalField>
      </h4>
    );
  }, [scene.title, scene.urls, excludedFields, setExcludedFieldsPartial]);

  function renderStudioDate() {
    const text =
      scene.studio && scene.date
        ? `${scene.studio.name} • ${scene.date}`
        : `${scene.studio?.name ?? scene.date ?? ""}`;

    if (text) {
      return <h5>{text}</h5>;
    }
  }

  const performerList = useMemo(() => {
    if (scene.performers?.length) {
      return (
        <div>
          {intl.formatMessage(
            { id: "countables.performers" },
            { count: scene?.performers?.length }
          )}
          : {scene?.performers?.map((p) => p.name).join(", ")}
        </div>
      );
    }
  }, [scene.performers, intl]);

  const studioCode = useMemo(() => {
    if (isActive && scene.code) {
      return (
        <h5>
          <OptionalField
            exclude={excludedFields.code}
            setExclude={(v) => setExcludedFieldsPartial({ code: v })}
          >
            {scene.code}
          </OptionalField>
        </h5>
      );
    }
  }, [isActive, scene.code, excludedFields.code, setExcludedFieldsPartial]);

  const dateField = useMemo(() => {
    if (isActive && scene.date) {
      return (
        <h5>
          <OptionalField
            exclude={excludedFields.date}
            setExclude={(v) => setExcludedFieldsPartial({ date: v })}
          >
            {scene.date}
          </OptionalField>
        </h5>
      );
    }
  }, [isActive, scene.date, excludedFields.date, setExcludedFieldsPartial]);

  const durationStatus = useMemo(() => {
    const stashSceneFile =
      stashScene.files.length > 0 ? stashScene.files[0] : undefined;

    return getDurationStatus(
      scene.duration,
      scene.fingerprints,
      stashSceneFile?.duration
    );
  }, [scene.duration, scene.fingerprints, stashScene.files]);

  const fingerprintStatus = useMemo(() => {
    return getFingerprintStatus(scene.fingerprints, stashScene.files);
  }, [scene.fingerprints, stashScene.files]);

  const director = useMemo(() => {
    if (scene.director) {
      return (
        <h5>
          <OptionalField
            exclude={excludedFields.director}
            setExclude={(v) => setExcludedFieldsPartial({ director: v })}
          >
            <FormattedMessage id="director" />: {scene.director}
          </OptionalField>
        </h5>
      );
    }
  }, [scene.director, excludedFields.director, setExcludedFieldsPartial]);

  const url = useMemo(() => {
    if (scene.urls) {
      return (
        <div className="scene-details">
          <OptionalField
            exclude={excludedFields.url}
            setExclude={(v) => setExcludedFieldsPartial({ url: v })}
          >
            {scene.urls.map((u) => (
              <div key={u}>
                <ExternalLink href={u}>{u}</ExternalLink>
              </div>
            ))}
          </OptionalField>
        </div>
      );
    }
  }, [scene.urls, excludedFields.url, setExcludedFieldsPartial]);

  const details = useMemo(() => {
    if (scene.details) {
      return (
        <div className="scene-details">
          <OptionalField
            exclude={excludedFields.details}
            setExclude={(v) => setExcludedFieldsPartial({ details: v })}
          >
            <TruncatedText text={scene.details ?? ""} lineCount={3} />
          </OptionalField>
        </div>
      );
    }
  }, [scene.details, excludedFields.details, setExcludedFieldsPartial]);

  const stashBoxID = useMemo(() => {
    if (scene.remote_site_id && stashBoxURL) {
      return (
        <div className="scene-details">
          <OptionalField
            exclude={excludedFields.stash_ids}
            setExclude={(v) => setExcludedFieldsPartial({ stash_ids: v })}
          >
            <ExternalLink href={stashBoxURL}>
              {scene.remote_site_id}
            </ExternalLink>
          </OptionalField>
        </div>
      );
    }
  }, [
    scene.remote_site_id,
    stashBoxURL,
    excludedFields.stash_ids,
    setExcludedFieldsPartial,
  ]);

  const studioField = useMemo(() => {
    async function studioModalCallback(
      studio: GQL.ScrapedStudio,
      toCreate?: GQL.StudioCreateInput,
      parentInput?: GQL.StudioCreateInput
    ) {
      if (toCreate) {
        if (parentInput && studio.parent) {
          if (toCreate.parent_id) {
            const parentUpdateData: GQL.StudioUpdateInput = {
              ...parentInput,
              id: toCreate.parent_id,
            };
            await updateStudio(parentUpdateData);
          } else {
            const parentID = await createNewStudio(studio.parent, parentInput);
            toCreate.parent_id = parentID;
          }
        }

        createNewStudio(studio, toCreate);
      }
    }

    function showStudioModal(t: GQL.ScrapedStudio) {
      createStudioModal(t, (toCreate, parentInput) => {
        studioModalCallback(t, toCreate, parentInput);
      });
    }

    if (scene.studio) {
      return (
        <div className="mt-2">
          <StudioResult
            studio={scene.studio}
            selectedID={studioID}
            setSelectedID={(id) => setStudioID(id)}
            onCreate={() => showStudioModal(scene.studio!)}
            endpoint={
              currentSource?.sourceInput.stash_box_endpoint ?? undefined
            }
            onLink={async () => {
              await linkStudio(scene.studio!, studioID!);
            }}
          />
        </div>
      );
    }
  }, [
    scene.studio,
    studioID,
    currentSource?.sourceInput.stash_box_endpoint,
    linkStudio,
    createStudioModal,
    createNewStudio,
    updateStudio,
  ]);

  const performerField = useMemo(() => {
    function showPerformerModal(t: GQL.ScrapedPerformer) {
      createPerformerModal(t, (toCreate) => {
        if (toCreate) {
          createNewPerformer(t, toCreate);
        }
      });
    }

    function setPerformerID(performerIndex: number, id: string | undefined) {
      const newPerformerIDs = [...performerIDs];
      newPerformerIDs[performerIndex] = id;
      setPerformerIDs(newPerformerIDs);
    }

    return (
      <div className="mt-2">
        <div>
          <Form.Group controlId="performers">
            {performers.map((performer, performerIndex) => (
              <PerformerResult
                performer={performer}
                selectedID={performerIDs[performerIndex]}
                setSelectedID={(id) => setPerformerID(performerIndex, id)}
                onCreate={() => showPerformerModal(performer)}
                onLink={async () => {
                  await linkPerformer(performer, performerIDs[performerIndex]!);
                }}
                endpoint={
                  currentSource?.sourceInput.stash_box_endpoint ?? undefined
                }
                key={`${performer.name ?? performer.remote_site_id ?? ""}`}
              />
            ))}
          </Form.Group>
        </div>
      </div>
    );
  }, [
    performers,
    performerIDs,
    currentSource?.sourceInput.stash_box_endpoint,
    linkPerformer,
    setPerformerIDs,
    createPerformerModal,
    createNewPerformer,
  ]);

  const tagsField = useMemo(() => {
    async function onCreateTag(t: GQL.ScrapedTag) {
      const toCreate: GQL.TagCreateInput = { name: t.name };
      const newTagID = await createNewTag(t, toCreate);
      if (newTagID !== undefined) {
        setTagIDs([...tagIDs, newTagID]);
      }
    }

    if (!config.setTags) return;

    const createTags = scene.tags?.filter((t) => !t.stored_id);

    return (
      <div className="mt-2">
        <div>
          <Form.Group controlId="tags" as={Row}>
            {FormUtils.renderLabel({
              title: `${intl.formatMessage({ id: "tags" })}:`,
            })}
            <Col sm={9} xl={12}>
              <TagSelect
                isMulti
                onSelect={(items) => {
                  setTagIDs(items.map((i) => i.id));
                }}
                ids={tagIDs}
              />
            </Col>
          </Form.Group>
        </div>
        {createTags?.map((t) => (
          <Badge
            className="tag-item"
            variant="secondary"
            key={t.name}
            onClick={() => {
              onCreateTag(t);
            }}
          >
            {t.name}
            <Button className="minimal ml-2">
              <Icon className="fa-fw" icon={faPlus} />
            </Button>
          </Badge>
        ))}
      </div>
    );
  }, [config.setTags, scene.tags, tagIDs, intl, createNewTag, setTagIDs]);

  if (loading) {
    return <LoadingIndicator card />;
  }

  return (
    <>
      <div className={isActive ? "col-lg-6" : ""}>
        <div className="row mx-0">
          {coverImage}
          <div className="d-flex flex-column justify-content-center scene-metadata">
            {title}

            {!isActive && (
              <>
                {renderStudioDate()}
                {performerList}
              </>
            )}

            {studioCode}
            {dateField}
            {durationStatus}
            {fingerprintStatus}
          </div>
        </div>
        {isActive && (
          <div className="d-flex flex-column">
            {stashBoxID}
            {director}
            {url}
            {details}
          </div>
        )}
      </div>
      {isActive && (
        <div className="col-lg-6">
          {studioField}
          {performerField}
          {tagsField}

          <div className="row no-gutters mt-2 align-items-center justify-content-end">
            <OperationButton operation={handleSave}>
              <FormattedMessage id="actions.save" />
            </OperationButton>
          </div>
        </div>
      )}
    </>
  );
};

export interface ISceneSearchResults {
  target: GQL.SlimSceneDataFragment;
  scenes: IScrapedScene[];
  selected: number | undefined;
  setSelected: (i: number) => void;
}

export const SceneSearchResults: React.FC<ISceneSearchResults> = ({
  target,
  scenes,
  selected,
  setSelected,
}) => {
  function getClassName(i: number) {
    return cx("row mx-0 mt-2 search-result", {
      "selected-result active": i === selected,
    });
  }

  return (
    <ul className="pl-0 mt-3 mb-0">
      {scenes.map((s, i) => (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions, react/no-array-index-key
        <li
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          onClick={() => setSelected(i)}
          className={getClassName(i)}
        >
          <StashSearchResult
            index={i}
            isActive={i === selected}
            scene={s}
            stashScene={target}
          />
        </li>
      ))}
    </ul>
  );
};

export default StashSearchResult;
