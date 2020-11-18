import React, { useState, useRef } from "react";
import useLayoutEffect from "@react-hook/passive-layout-effect";
import PropTypes from "prop-types";
import { useRect } from "@reach/rect";
import { Overlay } from "./overlay";
import get from "lodash.get";
import { useBoxcutter } from "../context";
import { min, max } from "../utils";

export function ToolTip({
  target,
  children,
  arrow,
  className,
  style,
  options = {},
}) {
  options = {
    mirrorTargetVisibility: true,
    ...options,
  };
  const { window } = useBoxcutter();
  const boxRef = useRef();
  const boxRect = useRect(boxRef);
  const boxHeight = get(boxRect, "height");
  const boxWidth = get(boxRect, "width");
  const arrowRef = useRef();
  const arrowRect = useRect(arrowRef);
  const arrowHeight = get(arrowRect, "height");
  const arrowWidth = get(arrowRect, "width");

  const [tip, setTip] = useState({
    box: {
      top: 0,
      left: 0,
    },
    arrow: {
      top: "center",
      left: 0,
    },
  });

  useLayoutEffect(() => {
    if (!boxRef.current) {
      return;
    }

    const spaceAbove = target.top - window.scrollTop;
    const spaceBelow =
      window.height + window.scrollTop - (target.top + target.height);
    const leftOffset = window.scrollLeft;
    const rightOffset = window.width + window.scrollLeft;
    const topIsVisible = spaceAbove < window.height && spaceAbove > 0;
    const bottomIsVisible = spaceBelow < window.height && spaceBelow > 0;
    const leftIsVisible = rightOffset > target.left && leftOffset < target.left;
    const rightIsVisible =
      rightOffset > target.left + target.width &&
      leftOffset < target.left + target.width;

    /**
     * Set vertical placement
     *
     * By default, we set it to be "above"
     * If we don't have space above, we set it "below"
     * If we don't have space below, we set it "center"
     * If we don't have space center, we hide it
     */
    let top;
    let verticalArrowPlacement;
    const verticalSpaceBetween =
      window.height - max(spaceAbove, 0) - max(spaceBelow, 0);
    if (spaceAbove > boxHeight) {
      top = topIsVisible
        ? target.top - boxHeight
        : window.height + window.scrollTop - boxHeight;
      verticalArrowPlacement = "below";
    } else if (spaceBelow > boxHeight) {
      top = target.top + target.height;
      top = bottomIsVisible ? target.top + target.height : window.scrollTop;
      verticalArrowPlacement = "above";
    } else if (verticalSpaceBetween > boxHeight) {
      top = min(
        window.scrollTop + window.height - boxHeight,
        target.top + target.height - boxHeight
      );
      verticalArrowPlacement = "center";
    } else {
      return setTip((t) => ({ ...t, isVisible: false }));
    }

    /**
     * Set horizontal placement
     *
     * By default, we set it to be "center"
     * If we don't have space, we set it "left"
     * If we don't have space, we set it "right"
     * If we don't have space, we hide it
     */
    let left;
    let arrowLeft;
    const centerHorizontalPlacement =
      target.left - (boxWidth - target.width) / 2;
    const hasSpaceLeft = centerHorizontalPlacement > leftOffset;
    const hasSpaceRight = centerHorizontalPlacement + boxWidth < rightOffset;
    const horizontalMiddleOfTarget =
      target.left + target.width / 2 - arrowWidth / 2;

    if (hasSpaceLeft && hasSpaceRight) {
      left = centerHorizontalPlacement;
      arrowLeft = boxWidth / 2 - arrowWidth / 2;
    } else if (leftOffset + boxWidth < rightOffset && !hasSpaceLeft) {
      left = leftOffset;
      arrowLeft = max(horizontalMiddleOfTarget - left, 0);
      console.log("here2");
    } else if (rightOffset - boxWidth > leftOffset && !hasSpaceRight) {
      left = rightOffset - boxWidth;
      /**
       * multiple by 1.5 to make up for the half an arrow subtracted in horizontalMiddleOfTarget...I think
       *
       * This is only an issue in firefox but hey, it works now so don't change it
       */
      arrowLeft = min(
        horizontalMiddleOfTarget - left,
        boxWidth - arrowWidth * 1.5
      );
    } else {
      return setTip((t) => ({ ...t, isVisible: false }));
    }

    /**
     * Catch the case when arrow is going from invisible to visible
     * and the arrow width was zero so the value calculated is being
     * divided by zero leading to the arrow being equal to NaN.
     */
    if (isNaN(arrowLeft)) {
      arrowLeft = 0;
    }

    /**
     * We are are mirroring the target visibiility, hide the
     * tooltip when the target is scrolled out of view
     */
    if (
      options.mirrorTargetVisibility &&
      ((!topIsVisible && !bottomIsVisible) ||
        (!leftIsVisible && !rightIsVisible))
    ) {
      return setTip((t) => ({ ...t, isVisible: false }));
    }

    /**
     * hide arrow when the user scrolls the target out of view horizontally
     *
     * we want 50% of the arrow width worth of space to be visible to keep the arrow
     */
    const enoughSpaceOnTheLeft =
      rightOffset > target.left + arrowWidth / 2 && leftOffset < target.left;
    const enoughSpaceOnTheRight =
      rightOffset > target.left + target.width &&
      leftOffset < target.left + target.width - arrowWidth / 2;
    if (!enoughSpaceOnTheLeft && !enoughSpaceOnTheRight) {
      verticalArrowPlacement = "center";
    }

    setTip({
      isVisible: true,
      box: {
        top,
        left,
      },
      arrow: {
        top: verticalArrowPlacement,
        left: arrowLeft,
      },
    });
  }, [
    window.height,
    window.width,
    window.scrollTop,
    window.scrollLeft,
    target.top,
    target.left,
    target.width,
    target.height,
    boxHeight,
    boxWidth,
    arrowHeight,
    arrowWidth,
    options.mirrorTargetVisibility,
  ]);

  const arrowSpan = <span ref={arrowRef}>{arrow}</span>;

  return (
    <Overlay
      ref={boxRef}
      top={tip.box.top}
      left={tip.box.left}
      zIndex={10}
      style={{
        display: tip.isVisible ? "block" : "none",
      }}
    >
      <ArrowWrapper
        rotate
        invisible={tip.arrow.top !== "above"}
        left={tip.arrow.left}
      >
        {arrowSpan}
      </ArrowWrapper>
      <div style={style} className={className}>
        {children}
      </div>
      <ArrowWrapper invisible={tip.arrow.top !== "below"} left={tip.arrow.left}>
        {arrowSpan}
      </ArrowWrapper>
    </Overlay>
  );
}

function ArrowWrapper({ rotate, invisible, children, left }) {
  return (
    <div
      style={{
        lineHeight: 0,
        visibility: invisible ? "hidden" : "visible",
        textAlign: "left",
        fontSize: 0,
      }}
    >
      <span
        style={{
          transform: rotate ? "rotate(180deg)" : "none",
          display: "inline-block",
          marginLeft: left,
        }}
      >
        {children}
      </span>
    </div>
  );
}

ToolTip.propTypes = {
  target: PropTypes.shape({
    top: PropTypes.number.isRequired,
    left: PropTypes.number.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }).isRequired,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]).isRequired,
  arrow: PropTypes.node,
  className: PropTypes.string,
  style: PropTypes.object,
  options: PropTypes.shape({
    mirrorTargetVisibility: PropTypes.bool,
  }),
};
