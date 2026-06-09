import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data downloaded" / "EDUCATION PROJECT DETAIL.xlsx"
OUTPUT = ROOT / "generated" / "research-dashboard.json"


METRIC_ROWS = {
    "landArea": (2, "Campus Land Area", "m2"),
    "totalBuildingArea": (3, "Total Building Area", "m2"),
    "aboveGroundArea": (4, "Above Ground Building Area", "m2"),
    "kindergartenArea": (5, "Kindergarten Area", "m2"),
    "teachingOfficeArea": (6, "Teaching and Office Area", "m2"),
    "studentDormArea": (7, "Dormitory Area", "m2"),
    "sportsArea": (8, "Sports Area", "m2"),
    "livingSupportArea": (9, "Living Support Area", "m2"),
    "staffDormArea": (10, "Staff Dormitory Area", "m2"),
    "otherArea": (11, "Other Area", "m2"),
    "undergroundArea": (12, "Underground Building Area", "m2"),
    "parkingRequired": (13, "Required Parking", "spaces"),
    "preKOutdoorArea": (14, "Pre-K Outdoor Activity Area", "m2"),
    "k12OutdoorArea": (15, "K-12 Outdoor Activity Area", "m2"),
    "buildingBaseArea": (16, "Building Base Area", "m2"),
    "floorAreaRatio": (17, "FAR", "ratio"),
    "buildingDensity": (18, "Building Density", "percent"),
    "greenRate": (19, "Green Rate", "percent"),
    "greenArea": (20, "Green Area", "m2"),
    "parkingSpaces": (21, "Parking Spaces", "spaces"),
    "parkingAboveGround": (22, "Above Ground Parking", "spaces"),
    "parkingUnderground": (23, "Underground Parking", "spaces"),
    "parkingStandard": (24, "Underground Parking Standard", "ratio"),
    "peopleCapacity": (25, "People Capacity", "people"),
    "staffCount": (26, "Staff Count", "people"),
    "studentCount": (27, "Student Count", "people"),
    "preKStudents": (28, "PreK-K Students", "people"),
    "primaryStudents": (29, "Primary Students", "people"),
    "middleStudents": (30, "Middle School Students", "people"),
    "highStudents": (31, "High School Students", "people"),
    "boardingStudents": (32, "Boarding Students", "people"),
    "primaryBoarding": (33, "Primary Boarding Students", "people"),
    "middleBoarding": (34, "Middle Boarding Students", "people"),
    "highBoarding": (35, "High Boarding Students", "people"),
    "boardingRate": (36, "Boarding Rate", "percent"),
    "primaryBoardingRate": (37, "Primary Boarding Rate", "percent"),
    "middleBoardingRate": (38, "Middle Boarding Rate", "percent"),
    "highBoardingRate": (39, "High Boarding Rate", "percent"),
    "buildingAreaPerStudent": (40, "Building Area per Student excl. Dorm", "m2/person"),
    "teachingAreaPerStudent": (41, "Teaching Area per Student", "m2/person"),
    "landAreaPerStudent": (42, "Land Area per Student", "m2/person"),
    "dormAreaPerBoarder": (43, "Dorm Area per Boarder", "m2/person"),
}

BUILDING_MIX = [
    "kindergartenArea",
    "teachingOfficeArea",
    "studentDormArea",
    "sportsArea",
    "livingSupportArea",
    "staffDormArea",
    "otherArea",
]

STUDENT_MIX = [
    "preKStudents",
    "primaryStudents",
    "middleStudents",
    "highStudents",
]

BOARDING_MIX = [
    "primaryBoarding",
    "middleBoarding",
    "highBoarding",
]

SCHOOL_NAME_OVERRIDES = {
    "南京威雅": "Wycombe Abbey School Nanjing",
    "淀山湖威雅": "Wycombe Abbey Dianshanhu",
    "成都威雅": "Chengdu Wycombe Abbey School",
    "金茂宝山双语学校(小学部）": "Jinmao Baoshan Bilingual School (Primary Division)",
    "三亚海棠弯阿丁莱": "Sanya Haitang Bay Ardingly College",
    "中山阿丁莱": "Zhongshan Ardingly College",
    "莫德林学校": "Maudlin School",
    "上海莱克顿-高中": "Shanghai Lucton High School",
    "山峰天津": "Summit Tianjin",
    "山峰上海": "Summit Shanghai",
    "卓越深圳": "Excellence Shenzhen",
    "金华江南中学": "Jinhua Jiangnan Middle School",
    "育才三中": "Yucai No.3 Middle School",
    "深圳海岸学校": "Shenzhen Coastal School",
    "深圳第二十八中学": "Shenzhen No.28 Middle School",
    "北外广州校区": "BFSU Guangzhou Campus",
    "深圳三十二高级中学": "Shenzhen No.32 Senior High School",
    "深圳怡翠实验学校": "Shenzhen Yicui Experimental School",
    "重庆十方界中学": "Chongqing Shifangjie Middle School",
    "前湾十单元九年一贯制学校项目": "Qianwan Unit 10 Nine-Year School Project",
    "西部重庆科学城 金凤学校": "Western Chongqing Science City Jinfeng School",
    "重庆科学城 含谷学校": "Chongqing Science City Hangu School",
    "重庆市八中科学城 中学校": "Chongqing No.8 Middle School Science City Campus",
    "重庆科学城 含谷初中": "Chongqing Science City Hangu Junior High School",
}

PROJECT_NODE_LINKS = {
    "南京威雅": {
        "projectNodeId": "project_d48e9ca4_b1fa_45ec_866b_928277526281",
        "projectLabel": "1910 WYCOMBE ABBY SCHOOL NANJING",
        "matchConfidence": "high",
    },
    "中山阿丁莱": {
        "projectNodeId": "project_47a4e443_2a57_48d6_9ee6_e8625f285a85",
        "projectLabel": "2011 ZHONGSHAN ARDINGLY COLLEGE",
        "matchConfidence": "high",
    },
}

EXCLUDED_SCHOOLS = {
    "西部重庆科学城 金凤学校",
}

COST_BENCHMARKS = [
    {
        "name": "Nanfang School",
        "investmentTotalWan": 26798,
        "unitCostYuan": 5285,
    },
    {
        "name": "Shenzhen Coastal School",
        "investmentTotalWan": 40140,
        "unitCostYuan": 7107,
    },
    {
        "name": "Zhongshan Ardingly College",
        "investmentTotalWan": 60000,
        "unitCostYuan": 5650,
        "projectLink": PROJECT_NODE_LINKS.get("中山阿丁莱"),
    },
    {
        "name": "Shenzhen No.32 Senior High School",
        "investmentTotalWan": 72000,
        "unitCostYuan": 7000,
    },
    {
        "name": "Wycombe Abbey School Nanjing",
        "investmentTotalWan": 83000,
        "unitCostYuan": 7414,
        "projectLink": PROJECT_NODE_LINKS.get("南京威雅"),
    },
    {
        "name": "Chongqing No.8 Middle School Science City Campus",
        "investmentTotalWan": 90000,
        "unitCostYuan": 4083,
    },
    {
        "name": "Shenzhen No.28 Middle School",
        "investmentTotalWan": 104000,
        "unitCostYuan": 7200,
    },
]


def clean_number(value):
    if pd.isna(value):
        return None
    if isinstance(value, str):
        value = value.strip()
        if not value or value.startswith("#"):
            return None
        value = value.replace("%", "")
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if pd.isna(number):
        return None
    return round(number, 4)


def school_id(name):
    safe = "".join(ch if ch.isalnum() else "_" for ch in name).strip("_").lower()
    return f"school_{safe}"


def sum_values(metrics, keys):
    values = [metrics.get(key) for key in keys]
    values = [value for value in values if isinstance(value, (int, float))]
    return round(sum(values), 4) if values else None


def school_columns(df):
    current_type = ""
    columns = []
    for col in range(2, df.shape[1]):
        raw_type = df.iloc[0, col]
        raw_name = df.iloc[1, col]
        if pd.notna(raw_type) and str(raw_type).strip():
            current_type = str(raw_type).strip()
        if pd.notna(raw_name) and str(raw_name).strip():
            columns.append((col, current_type, str(raw_name).strip().replace("\n", " ")))
    return columns


def main():
    df = pd.read_excel(SOURCE, sheet_name="校舍规模", header=None)
    schools = []

    for col, school_type, name in school_columns(df):
        if name in EXCLUDED_SCHOOLS:
            continue
        metrics = {
            key: clean_number(df.iloc[row_index, col])
            for key, (row_index, _label, _unit) in METRIC_ROWS.items()
        }

        if metrics.get("studentCount") in (None, 0):
            metrics["studentCount"] = sum_values(metrics, STUDENT_MIX)
        if metrics.get("boardingStudents") in (None, 0):
            metrics["boardingStudents"] = sum_values(metrics, BOARDING_MIX)

        student_count = metrics.get("studentCount") or 0
        boarding_count = metrics.get("boardingStudents") or 0
        total_building = metrics.get("totalBuildingArea") or 0
        land_area = metrics.get("landArea") or 0
        teaching_area = metrics.get("teachingOfficeArea") or 0
        dorm_area = metrics.get("studentDormArea") or 0

        derived = {
            "buildingAreaPerStudentCalc": round(total_building / student_count, 4) if student_count else None,
            "teachingAreaPerStudentCalc": round(teaching_area / student_count, 4) if student_count else None,
            "landAreaPerStudentCalc": round(land_area / student_count, 4) if student_count else None,
            "dormAreaPerBoarderCalc": round(dorm_area / boarding_count, 4) if boarding_count else None,
        }

        schools.append({
            "id": school_id(name),
            "name": name,
            "englishName": SCHOOL_NAME_OVERRIDES.get(name, name),
            "schoolType": school_type,
            "projectLink": PROJECT_NODE_LINKS.get(name),
            "metrics": metrics,
            "buildingMix": {key: metrics.get(key) for key in BUILDING_MIX},
            "studentMix": {key: metrics.get(key) for key in STUDENT_MIX},
            "boardingMix": {key: metrics.get(key) for key in BOARDING_MIX},
            "derived": derived,
        })

    dashboard = {
        "source": "data downloaded/EDUCATION PROJECT DETAIL.xlsx",
        "sheet": "校舍规模",
        "schoolCount": len(schools),
        "schoolTypes": sorted({school["schoolType"] for school in schools if school["schoolType"]}),
        "metrics": {
            key: {"label": label, "unit": unit}
            for key, (_row, label, unit) in METRIC_ROWS.items()
        },
        "comparisons": [
            "totalBuildingArea",
            "landArea",
            "studentCount",
            "buildingAreaPerStudent",
            "landAreaPerStudent",
            "dormAreaPerBoarder",
            "floorAreaRatio",
            "greenRate",
            "boardingRate",
        ],
        "costBenchmarks": COST_BENCHMARKS,
        "schools": schools,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(dashboard, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT} with {len(schools)} schools")
    print(json.dumps(dashboard["schoolTypes"], ensure_ascii=False))


if __name__ == "__main__":
    main()
