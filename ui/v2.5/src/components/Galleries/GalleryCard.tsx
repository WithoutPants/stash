import { Button, ButtonGroup } from "react-bootstrap";
import React from "react";
import { Link } from "react-router-dom";
import * as GQL from "src/core/generated-graphql";
import { FormattedPlural } from "react-intl";
import { useConfiguration } from "src/core/StashService";
import {
  Card,
  HoverPopover,
  Icon,
  TagLink,
} from "src/components/Shared";
import { TextUtils } from "src/utils";
import { PerformerPopoverButton } from "../Shared/PerformerPopoverButton";

interface IProps {
  gallery: GQL.SlimGalleryDataFragment;
  selecting?: boolean;
  selected?: boolean | undefined;
  zoomIndex?: number;
  onSelectedChanged?: (selected: boolean, shiftKey: boolean) => void;
}

export const GalleryCard: React.FC<IProps> = (props) => {
  const config = useConfiguration();
  const showStudioAsText =
    config?.data?.configuration.interface.showStudioAsText ?? false;

  function maybeRenderScenePopoverButton() {
    if (props.gallery.scenes.length === 0) return;

    const popoverContent = props.gallery.scenes.map((scene) => (
      <TagLink key={scene.id} scene={scene} />
    ));

    return (
      <HoverPopover placement="bottom" content={popoverContent}>
        <Button className="minimal">
          <Icon icon="play-circle" />
          <span>{props.gallery.scenes.length}</span>
        </Button>
      </HoverPopover>
    );
  }

  function maybeRenderTagPopoverButton() {
    if (props.gallery.tags.length <= 0) return;

    const popoverContent = props.gallery.tags.map((tag) => (
      <TagLink key={tag.id} tag={tag} tagType="gallery" />
    ));

    return (
      <HoverPopover placement="bottom" content={popoverContent}>
        <Button className="minimal">
          <Icon icon="tag" />
          <span>{props.gallery.tags.length}</span>
        </Button>
      </HoverPopover>
    );
  }

  function maybeRenderPerformerPopoverButton() {
    if (props.gallery.performers.length <= 0) return;

    return <PerformerPopoverButton performers={props.gallery.performers} />;
  }

  function maybeRenderSceneStudioOverlay() {
    if (!props.gallery.studio) return;

    return (
      <div className="scene-studio-overlay">
        <Link to={`/studios/${props.gallery.studio.id}`}>
          {showStudioAsText ? (
            props.gallery.studio.name
          ) : (
            <img
              className="image-thumbnail"
              alt={props.gallery.studio.name}
              src={props.gallery.studio.image_path ?? ""}
            />
          )}
        </Link>
      </div>
    );
  }

  function maybeRenderOrganized() {
    if (props.gallery.organized) {
      return (
        <div>
          <Button className="minimal">
            <Icon icon="box" />
          </Button>
        </div>
      );
    }
  }

  function maybeRenderPopoverButtonGroup() {
    if (
      props.gallery.scenes.length > 0 ||
      props.gallery.performers.length > 0 ||
      props.gallery.tags.length > 0 ||
      props.gallery.organized
    ) {
      return (
        <>
          <hr />
          <ButtonGroup className="card-popovers">
            {maybeRenderTagPopoverButton()}
            {maybeRenderPerformerPopoverButton()}
            {maybeRenderScenePopoverButton()}
            {maybeRenderOrganized()}
          </ButtonGroup>
        </>
      );
    }
  }

  function maybeRenderRatingBanner() {
    if (!props.gallery.rating) {
      return;
    }
    return (
      <div
        className={`rating-banner ${
          props.gallery.rating ? `rating-${props.gallery.rating}` : ""
        }`}
      >
        RATING: {props.gallery.rating}
      </div>
    );
  }

  return (
    <Card
      className={`gallery-card zoom-${props.zoomIndex}`}
      url={`/galleries/${props.gallery.id}`}
      title={
        props.gallery.title
          ? props.gallery.title
          : TextUtils.fileNameFromPath(props.gallery.path ?? "")
      }
      linkClassName="gallery-card-header"
      image={
        <>
          {props.gallery.cover ? (
            <img
              className="gallery-card-image"
              alt={props.gallery.title ?? ""}
              src={`${props.gallery.cover.paths.thumbnail}`}
            />
          ) : undefined}
          {maybeRenderRatingBanner()}
        </>
      }
      overlays={maybeRenderSceneStudioOverlay()}
      details={
        <>
          <span>
            {props.gallery.image_count}&nbsp;
            <FormattedPlural
              value={props.gallery.image_count}
              one="image"
              other="images"
            />
            .
          </span>
        </>
      }
      popovers={maybeRenderPopoverButtonGroup()}
      selected={props.selected}
      selecting={props.selecting}
      onSelectedChanged={props.onSelectedChanged}
    />
  );
};
