import React from "react";
import { Link } from "react-router-dom";
import * as GQL from "src/core/generated-graphql";
import NavUtils from "src/utils/navigation";
import { GridCard } from "src/components/Shared/GridCard";
import { ButtonGroup } from "react-bootstrap";
import { FormattedMessage } from "react-intl";
import { PopoverCountButton } from "../Shared/PopoverCountButton";
import { RatingBanner } from "../Shared/RatingBanner";
import {
  ListFilterModel,
  useDefaultFilter,
} from "src/models/list-filter/filter";

interface IProps {
  studio: GQL.StudioDataFragment;
  hideParent?: boolean;
  selecting?: boolean;
  selected?: boolean;
  onSelectedChanged?: (selected: boolean, shiftKey: boolean) => void;
}

function maybeRenderParent(
  studio: GQL.StudioDataFragment,
  hideParent?: boolean
) {
  if (!hideParent && studio.parent_studio) {
    return (
      <div className="studio-parent-studios">
        <FormattedMessage
          id="part_of"
          values={{
            parent: (
              <Link to={`/studios/${studio.parent_studio.id}`}>
                {studio.parent_studio.name}
              </Link>
            ),
          }}
        />
      </div>
    );
  }
}

function maybeRenderChildren(
  studio: GQL.StudioDataFragment,
  defaultFilter: ListFilterModel
) {
  if (studio.child_studios.length > 0) {
    return (
      <div className="studio-child-studios">
        <FormattedMessage
          id="parent_of"
          values={{
            children: (
              <Link to={NavUtils.makeChildStudiosUrl(studio, defaultFilter)}>
                {studio.child_studios.length} studios
              </Link>
            ),
          }}
        />
      </div>
    );
  }
}

export const StudioCard: React.FC<IProps> = ({
  studio,
  hideParent,
  selecting,
  selected,
  onSelectedChanged,
}) => {
  const sceneDefaultFilter: ListFilterModel = useDefaultFilter(
    GQL.FilterMode.Scenes
  );
  const imageDefaultFilter: ListFilterModel = useDefaultFilter(
    GQL.FilterMode.Images
  );
  const galleryDefaultFilter: ListFilterModel = useDefaultFilter(
    GQL.FilterMode.Galleries
  );
  const movieDefaultFilter: ListFilterModel = useDefaultFilter(
    GQL.FilterMode.Movies
  );
  const performerDefaultFilter: ListFilterModel = useDefaultFilter(
    GQL.FilterMode.Performers
  );
  const studioDefaultFilter: ListFilterModel = useDefaultFilter(
    GQL.FilterMode.Studios
  );

  function maybeRenderScenesPopoverButton() {
    if (!studio.scene_count) return;

    return (
      <PopoverCountButton
        className="scene-count"
        type="scene"
        count={studio.scene_count}
        url={NavUtils.makeStudioScenesUrl(studio, sceneDefaultFilter)}
      />
    );
  }

  function maybeRenderImagesPopoverButton() {
    if (!studio.image_count) return;

    return (
      <PopoverCountButton
        className="image-count"
        type="image"
        count={studio.image_count}
        url={NavUtils.makeStudioImagesUrl(studio, imageDefaultFilter)}
      />
    );
  }

  function maybeRenderGalleriesPopoverButton() {
    if (!studio.gallery_count) return;

    return (
      <PopoverCountButton
        className="gallery-count"
        type="gallery"
        count={studio.gallery_count}
        url={NavUtils.makeStudioGalleriesUrl(studio, galleryDefaultFilter)}
      />
    );
  }

  function maybeRenderMoviesPopoverButton() {
    if (!studio.movie_count) return;

    return (
      <PopoverCountButton
        className="movie-count"
        type="movie"
        count={studio.movie_count}
        url={NavUtils.makeStudioMoviesUrl(studio, movieDefaultFilter)}
      />
    );
  }

  function maybeRenderPerformersPopoverButton() {
    if (!studio.performer_count) return;

    return (
      <PopoverCountButton
        className="performer-count"
        type="performer"
        count={studio.performer_count}
        url={NavUtils.makeStudioPerformersUrl(studio, performerDefaultFilter)}
      />
    );
  }

  function maybeRenderPopoverButtonGroup() {
    if (
      studio.scene_count ||
      studio.image_count ||
      studio.gallery_count ||
      studio.movie_count ||
      studio.performer_count
    ) {
      return (
        <>
          <hr />
          <ButtonGroup className="card-popovers">
            {maybeRenderScenesPopoverButton()}
            {maybeRenderMoviesPopoverButton()}
            {maybeRenderImagesPopoverButton()}
            {maybeRenderGalleriesPopoverButton()}
            {maybeRenderPerformersPopoverButton()}
          </ButtonGroup>
        </>
      );
    }
  }

  return (
    <GridCard
      className="studio-card"
      url={`/studios/${studio.id}`}
      title={studio.name}
      linkClassName="studio-card-header"
      image={
        <img
          className="studio-card-image"
          alt={studio.name}
          src={studio.image_path ?? ""}
        />
      }
      details={
        <div className="studio-card__details">
          {maybeRenderParent(studio, hideParent)}
          {maybeRenderChildren(studio, studioDefaultFilter)}
          <RatingBanner rating={studio.rating100} />
        </div>
      }
      popovers={maybeRenderPopoverButtonGroup()}
      selected={selected}
      selecting={selecting}
      onSelectedChanged={onSelectedChanged}
    />
  );
};
