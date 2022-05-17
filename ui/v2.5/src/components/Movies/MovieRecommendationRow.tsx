import React, { FunctionComponent } from "react";
import { useFindMovies } from "src/core/StashService";
import Slider from "react-slick";
import { MovieCard } from "./MovieCard";
import { ListFilterModel } from "src/models/list-filter/filter";
import { getSlickSliderSettings } from "src/core/recommendations";

interface IProps {
  isTouch: boolean;
  filter: ListFilterModel;
  header: String;
  linkText: String;
  index: number;
}

export const MovieRecommendationRow: FunctionComponent<IProps> = (
  props: IProps
) => {
  const result = useFindMovies(props.filter);
  const cardCount = result.data?.findMovies.count;
  if (result.loading) {
    return (
      <div className="recommendation-row movie-recommendations">
        <div className="recommendation-row-head">
          <div>
            <h2>{props.header}</h2>
          </div>
          <a href={`/movies?${props.filter.makeQueryParameters()}`}>
            {props.linkText}
          </a>
        </div>
        <Slider
          {...getSlickSliderSettings(props.filter.itemsPerPage!, props.isTouch)}
        >
          {[...Array(props.filter.itemsPerPage)].map((i) => (
            <div key={i} className="movie-skeleton skeleton-card"></div>
          ))}
        </Slider>
      </div>
    );
  }

  if (cardCount === 0) {
    return null;
  }

  return (
    <div className="recommendation-row movie-recommendations">
      <div className="recommendation-row-head">
        <div>
          <h2>{props.header}</h2>
        </div>
        <a href={`/movies?${props.filter.makeQueryParameters()}`}>
          {props.linkText}
        </a>
      </div>
      <Slider {...getSlickSliderSettings(cardCount!, props.isTouch)}>
        {result.data?.findMovies.movies.map((m) => (
          <MovieCard key={m.id} movie={m} />
        ))}
      </Slider>
    </div>
  );
};
