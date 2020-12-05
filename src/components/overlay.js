import React, { forwardRef } from "react";
import PropTypes from "prop-types";
import { isUndefined, isFunction } from "../utils";

export const Overlay = forwardRef(function Overlay(
  {
    top,
    left,
    bottom,
    right,
    size,
    height,
    width,
    background,
    style,
    interactive = false,
    zIndex = 1,
    onClick,
    color,
    ...rest
  },
  ref
) {
  if (isFunction(onClick)) {
    interactive = true;
  }

  const hasSize =
    !isUndefined(size) || !isUndefined(height) || !isUndefined(width);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        boxSizing: "border-box",
        margin: "auto",
        ...(hasSize ? {} : { whiteSpace: "nowrap" }),
        ...style,
        background,
        color,
        top,
        left,
        bottom,
        right,
        zIndex,
        height: isUndefined(height) ? size : height,
        width: isUndefined(width) ? size : width,
        pointerEvents: interactive ? "auto" : "none",
      }}
      {...rest}
      onClick={onClick}
    />
  );
});

Overlay.propTypes = {
  top: PropTypes.number,
  left: PropTypes.number,
  bottom: PropTypes.number,
  right: PropTypes.number,
  size: PropTypes.number,
  height: PropTypes.number,
  width: PropTypes.number,
  background: PropTypes.string,
  style: PropTypes.object,
  interactive: PropTypes.bool,
  zIndex: PropTypes.number,
  onClick: PropTypes.func,
};
