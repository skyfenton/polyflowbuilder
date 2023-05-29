// util functions related to unit counting

import { getCatalogFromProgramIDIndex } from '$lib/common/util/courseDataUtilCommon';
import type { Program } from '@prisma/client';
import type { CourseCache } from '$lib/types';
import type { Course, Term } from '../schema/flowchartSchema';

export function incrementRangedUnits(unitCount1: string, unitCount2: string): string {
  const unitSplit1 = unitCount1.split('-').map((val) => Number(val));
  const unitSplit2 = unitCount2.split('-').map((val) => Number(val));

  const unit1Max = isNaN(unitSplit1[1]) ? unitSplit1[0] : unitSplit1[1];
  const unit2Max = isNaN(unitSplit2[1]) ? unitSplit2[0] : unitSplit2[1];

  const sumUnitsLow = unitSplit1[0] + unitSplit2[0];
  const sumUnitsHigh = unit1Max + unit2Max;

  return sumUnitsLow === sumUnitsHigh ? sumUnitsLow.toString() : sumUnitsLow + '-' + sumUnitsHigh;
}

export function computeTermUnits(
  termData: Course[],
  programId: string[],
  // bc we can call from either client or server
  courseCache: CourseCache[],
  programCache: Program[]
): string {
  let computedTermUnits = '0';

  termData.forEach((c) => {
    if (c.id) {
      // select the correct catalog
      const courseCatalog = getCatalogFromProgramIDIndex(
        c.programIdIndex ?? 0,
        programId,
        programCache
      );
      if (!courseCatalog) {
        throw new Error('unitCounterUtil: undefined courseCatalog');
      }
      const courseMetadata = courseCache
        .find((cache) => cache.catalog === courseCatalog)
        ?.courses.find((crs) => crs.id === c.id);
      if (!courseMetadata) {
        throw new Error(`unitCounterUtil: unable to find course metadata for course ${c.id}`);
      }
      computedTermUnits = incrementRangedUnits(computedTermUnits, courseMetadata.units);
    } else if (c.customUnits) {
      computedTermUnits = incrementRangedUnits(computedTermUnits, c.customUnits);
    }
  });

  return computedTermUnits;
}

export function computeTotalUnits(
  termsData: Term[],
  courseCache: CourseCache[],
  programCache: Program[],
  fullCompute = false,
  programId?: string[]
): string {
  let flowUnitTotal = '0';
  termsData.forEach((termData) => {
    if (fullCompute) {
      if (!programId) {
        throw new Error('computeTotalUnits: requested fullCompute with no programId');
      }
      const termUnits = computeTermUnits(termData.courses, programId, courseCache, programCache);
      flowUnitTotal = incrementRangedUnits(flowUnitTotal, termUnits);
    } else {
      flowUnitTotal = incrementRangedUnits(flowUnitTotal, termData.tUnits);
    }
  });
  return flowUnitTotal;
}
