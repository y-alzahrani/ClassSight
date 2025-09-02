# services.py
from datetime import date as dt_date
from typing import List, Dict, Any, Optional

from database import Database
from models import ClassroomSyntheticData


class AnalyticsService:
    def __init__(self, db: Database):
        self.db = db

        # SQL expression to extract hour-of-day (0-23) from start_time TEXT.
        # Handles: "HH:MM", "HH:MM:SS", "H:MM AM/PM", "H AM/PM", and "8AM/8PM".
        self.HOUR_EXPR = r"""
        CASE
          WHEN start_time IS NULL THEN NULL

          -- 'HH:MM' or 'HH:MM:SS'
          WHEN start_time ~ '^\s*\d{1,2}:\d{2}(:\d{2})?\s*$'
            THEN EXTRACT(HOUR FROM (trim(start_time))::time)

          -- 'HH:MM AM/PM' (with space)
          WHEN start_time ~* '^\s*\d{1,2}:\d{2}\s*(AM|PM)\s*$'
            THEN EXTRACT(HOUR FROM to_timestamp(trim(start_time), 'HH12:MI AM'))

          -- 'HH AM/PM' (with space)
          WHEN start_time ~* '^\s*\d{1,2}\s*(AM|PM)\s*$'
            THEN EXTRACT(HOUR FROM to_timestamp(trim(start_time), 'HH12 AM'))

          -- 'HHAM' or 'HHPM' (no space) -> insert a space before AM/PM then parse
          WHEN start_time ~* '^\s*\d{1,2}(AM|PM)\s*$'
            THEN EXTRACT(HOUR FROM to_timestamp(regexp_replace(trim(start_time), '(?i)(am|pm)$', ' \1'), 'HH12 AM'))

          ELSE NULL
        END
        """

    # -----------------------
    # Internal helpers
    # -----------------------
    async def _fetch_one(self, query: str, *params: Any) -> Optional[Dict[str, Any]]:
        """
        Safe single-row fetch built on top of execute_query.
        Returns a plain dict (so .get works) or None if no rows.
        """
        rows = await self.db.execute_query(query, *params)
        if not rows:
            return None
        row = rows[0]
        try:
            return dict(row)
        except Exception:
            # If it's already a dict-like, just return as is
            return row

    @staticmethod
    def _parse_iso_date(s: Optional[str]) -> Optional[dt_date]:
        """Parse 'YYYY-MM-DD' to datetime.date (or None)."""
        if not s:
            return None
        try:
            return dt_date.fromisoformat(s)
        except ValueError:
            raise ValueError(f"Invalid date format: {s}. Use YYYY-MM-DD.")

    # -----------------------
    # Raw data
    # -----------------------
    async def get_classroom_data(self, limit: int = 100) -> List[ClassroomSyntheticData]:
        query = """
            SELECT *
            FROM classroom_synthetic_data_updated
            ORDER BY date DESC
            LIMIT $1
        """
        results = await self.db.execute_query(query, limit)
        return [ClassroomSyntheticData(**row) for row in results]

    # ---------------------------------
    # Attention vs Distraction (weekly)
    # ---------------------------------
    async def get_attention_vs_distraction_weekly(self) -> List[Dict[str, Any]]:
        query = """
            SELECT 
                EXTRACT(WEEK FROM date) AS week,
                EXTRACT(YEAR FROM date) AS year,
                AVG(avg_attention_rate) AS avg_attention_rate,
                AVG(avg_distraction_rate) AS avg_distraction_rate
            FROM classroom_synthetic_data_updated
            GROUP BY 1, 2
            ORDER BY 2, 1
        """
        results = await self.db.execute_query(query)
        return [
            {
                "week": int(r["week"]),
                "year": int(r["year"]),
                "avg_attention_rate": float(r["avg_attention_rate"]),
                "avg_distraction_rate": float(r["avg_distraction_rate"]),
            }
            for r in results
        ]

    # --------------------------------
    # Attention vs Distraction (daily)
    # --------------------------------
    async def get_attention_vs_distraction_daily(
        self, start_date: Optional[str] = None, end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        base = """
            SELECT 
                date,
                AVG(avg_attention_rate) AS avg_attention_rate,
                AVG(avg_distraction_rate) AS avg_distraction_rate
            FROM classroom_synthetic_data_updated
        """
        params: List[Any] = []
        conds: List[str] = []

        if start_date:
            params.append(self._parse_iso_date(start_date))
            conds.append(f"date >= ${len(params)}")
        if end_date:
            params.append(self._parse_iso_date(end_date))
            conds.append(f"date <= ${len(params)}")

        if conds:
            base += " WHERE " + " AND ".join(conds)
        base += " GROUP BY date ORDER BY date"

        results = await self.db.execute_query(base, *params)
        return [
            {
                "date": str(r["date"]),
                "avg_attention_rate": float(r["avg_attention_rate"]),
                "avg_distraction_rate": float(r["avg_distraction_rate"]),
            }
            for r in results
        ]

    # ---------------------------------
    # Attention vs Distraction (hourly)
    # ---------------------------------
    async def get_attention_vs_distraction_hourly(
        self, target_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        hour_expr = self.HOUR_EXPR
        if target_date:
            d = self._parse_iso_date(target_date)
            query = f"""
                SELECT 
                    ({hour_expr})::int AS hour,
                    AVG(avg_attention_rate) AS avg_attention_rate,
                    AVG(avg_distraction_rate) AS avg_distraction_rate
                FROM classroom_synthetic_data_updated
                WHERE date = $1
                  AND ({hour_expr}) IS NOT NULL
                GROUP BY 1
                ORDER BY 1
            """
            results = await self.db.execute_query(query, d)
        else:
            query = f"""
                SELECT 
                    ({hour_expr})::int AS hour,
                    AVG(avg_attention_rate) AS avg_attention_rate,
                    AVG(avg_distraction_rate) AS avg_distraction_rate
                FROM classroom_synthetic_data_updated
                WHERE ({hour_expr}) IS NOT NULL
                GROUP BY 1
                ORDER BY 1
            """
            results = await self.db.execute_query(query)

        return [
            {
                "hour": int(r["hour"]),
                "avg_attention_rate": float(r["avg_attention_rate"]),
                "avg_distraction_rate": float(r["avg_distraction_rate"]),
            }
            for r in results
        ]

    # ----------------
    # Students weekly
    # ----------------
    async def get_students_weekly(self) -> List[Dict[str, Any]]:
        query = """
            SELECT 
                EXTRACT(WEEK FROM date) AS week,
                EXTRACT(YEAR FROM date) AS year,
                AVG(max_students_no) AS max_students_no,
                AVG(min_students_no) AS min_students_no
            FROM classroom_synthetic_data_updated
            GROUP BY 1, 2
            ORDER BY 2, 1
        """
        results = await self.db.execute_query(query)
        return [
            {
                "week": int(r["week"]),
                "year": int(r["year"]),
                "max_students_no": float(r["max_students_no"]),
                "min_students_no": float(r["min_students_no"]),
            }
            for r in results
        ]

    # ---------------
    # Students daily
    # ---------------
    async def get_students_daily(
        self, start_date: Optional[str] = None, end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        base = """
            SELECT 
                date,
                AVG(max_students_no) AS max_students_no,
                AVG(min_students_no) AS min_students_no
            FROM classroom_synthetic_data_updated
        """
        params: List[Any] = []
        conds: List[str] = []

        if start_date:
            params.append(self._parse_iso_date(start_date))
            conds.append(f"date >= ${len(params)}")
        if end_date:
            params.append(self._parse_iso_date(end_date))
            conds.append(f"date <= ${len(params)}")

        if conds:
            base += " WHERE " + " AND ".join(conds)
        base += " GROUP BY date ORDER BY date"

        results = await self.db.execute_query(base, *params)
        return [
            {
                "date": str(r["date"]),
                "max_students_no": float(r["max_students_no"]),
                "min_students_no": float(r["min_students_no"]),
            }
            for r in results
        ]

    # ----------------
    # Students hourly
    # ----------------
    async def get_students_hourly(
        self, target_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        hour_expr = self.HOUR_EXPR
        if target_date:
            d = self._parse_iso_date(target_date)
            query = f"""
                SELECT 
                    ({hour_expr})::int AS hour,
                    AVG(max_students_no) AS max_students_no,
                    AVG(min_students_no) AS min_students_no
                FROM classroom_synthetic_data_updated
                WHERE date = $1
                  AND ({hour_expr}) IS NOT NULL
                GROUP BY 1
                ORDER BY 1
            """
            results = await self.db.execute_query(query, d)
        else:
            query = f"""
                SELECT 
                    ({hour_expr})::int AS hour,
                    AVG(max_students_no) AS max_students_no,
                    AVG(min_students_no) AS min_students_no
                FROM classroom_synthetic_data_updated
                WHERE ({hour_expr}) IS NOT NULL
                GROUP BY 1
                ORDER BY 1
            """
            results = await self.db.execute_query(query)

        return [
            {
                "hour": int(r["hour"]),
                "max_students_no": float(r["max_students_no"]),
                "min_students_no": float(r["min_students_no"]),
            }
            for r in results
        ]

    # ----------
    # Dashboard
    # ----------
    async def get_dashboard_insights(self) -> Dict[str, Any]:
        hour_expr = self.HOUR_EXPR

        # Peak attention hour (derived from start_time)
        peak_hour_query = f"""
            SELECT 
                ({hour_expr})::int AS hour,
                AVG(avg_attention_rate) AS avg_attention
            FROM classroom_synthetic_data_updated
            WHERE ({hour_expr}) IS NOT NULL
            GROUP BY 1
            ORDER BY avg_attention DESC
            LIMIT 1
        """
        peak_hour_result = await self._fetch_one(peak_hour_query)

        # Best day of week (from date)
        best_day_query = """
            SELECT 
                TO_CHAR(date, 'FMDay') AS day_name,
                AVG(avg_attention_rate) AS avg_attention
            FROM classroom_synthetic_data_updated
            GROUP BY 1
            ORDER BY avg_attention DESC
            LIMIT 1
        """
        best_day_result = await self._fetch_one(best_day_query)

        # Capacity trend: last 7d vs previous 7d
        capacity_trend_query = """
            WITH recent_data AS (
                SELECT AVG(max_students_no) AS recent_capacity
                FROM classroom_synthetic_data_updated
                WHERE date >= CURRENT_DATE - INTERVAL '7 days'
            ),
            older_data AS (
                SELECT AVG(max_students_no) AS older_capacity
                FROM classroom_synthetic_data_updated
                WHERE date < CURRENT_DATE - INTERVAL '7 days'
                  AND date >= CURRENT_DATE - INTERVAL '14 days'
            )
            SELECT 
                COALESCE(r.recent_capacity, 0) AS recent_capacity,
                COALESCE(o.older_capacity, 0) AS older_capacity,
                CASE 
                    WHEN COALESCE(r.recent_capacity, 0) > COALESCE(o.older_capacity, 0) THEN 'increasing'
                    WHEN COALESCE(r.recent_capacity, 0) < COALESCE(o.older_capacity, 0) THEN 'decreasing'
                    ELSE 'stable'
                END AS trend
            FROM recent_data r
            FULL OUTER JOIN older_data o ON true
        """
        capacity_trend_result = await self._fetch_one(capacity_trend_query)

        # Overall stats
        overall_stats_query = """
            SELECT 
                AVG(avg_attention_rate) AS overall_attention,
                AVG(
                  CASE WHEN students_enrolled > 0 
                       THEN (avg_students_no::float / students_enrolled::float) * 100
                       ELSE NULL
                  END
                ) AS overall_attendance,
                COUNT(*) AS total_sessions,
                SUM(students_enrolled) AS total_students
            FROM classroom_synthetic_data_updated
        """
        overall_stats = await self._fetch_one(overall_stats_query)

        return {
            "peak_attention_hour": int(peak_hour_result["hour"]) if peak_hour_result and peak_hour_result.get("hour") is not None else 9,
            "peak_attention_score": round(float(peak_hour_result["avg_attention"]) if peak_hour_result and peak_hour_result.get("avg_attention") is not None else 0, 1),
            "best_day_of_week": best_day_result["day_name"].strip() if best_day_result and best_day_result.get("day_name") else "Monday",
            "best_day_attention": round(float(best_day_result["avg_attention"]) if best_day_result and best_day_result.get("avg_attention") is not None else 0, 1),
            "capacity_trend": capacity_trend_result["trend"] if capacity_trend_result and capacity_trend_result.get("trend") else "stable",
            "recent_capacity": round(float(capacity_trend_result["recent_capacity"]) if capacity_trend_result and capacity_trend_result.get("recent_capacity") is not None else 0, 1),
            "older_capacity": round(float(capacity_trend_result["older_capacity"]) if capacity_trend_result and capacity_trend_result.get("older_capacity") is not None else 0, 1),
            "overall_attention": round(float(overall_stats["overall_attention"]) if overall_stats and overall_stats.get("overall_attention") is not None else 0, 1),
            "overall_attendance": round(float(overall_stats["overall_attendance"]) if overall_stats and overall_stats.get("overall_attendance") is not None else 0, 1),
            "total_sessions": int(overall_stats["total_sessions"]) if overall_stats and overall_stats.get("total_sessions") is not None else 0,
            "total_students": int(overall_stats["total_students"]) if overall_stats and overall_stats.get("total_students") is not None else 0,
        }

    # -----------------------------
    # Capacity trends over time
    # -----------------------------
    async def get_student_capacity_trends(self) -> List[Dict[str, Any]]:
        query = """
            SELECT 
                date,
                max_students_no,
                min_students_no,
                avg_students_no,
                students_enrolled
            FROM classroom_synthetic_data_updated
            ORDER BY date
        """
        results = await self.db.execute_query(query)
        return [
            {
                "date": str(r["date"]),
                "max_students_no": float(r["max_students_no"]),
                "min_students_no": float(r["min_students_no"]),
                "avg_students_no": float(r["avg_students_no"]),
                "students_enrolled": int(r["students_enrolled"]),
            }
            for r in results
        ]

    # -----------------------------
    # EDA Enhanced Analytics
    # -----------------------------
    
    async def get_attendance_analytics_hourly(self, target_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get hourly attendance analytics with percentage calculations"""
        hour_expr = self.HOUR_EXPR
        if target_date:
            d = self._parse_iso_date(target_date)
            query = f"""
                SELECT 
                    ({hour_expr})::int AS hour,
                    AVG(
                        CASE WHEN students_enrolled > 0 
                             THEN (avg_students_no::float / students_enrolled::float) * 100
                             ELSE 0
                        END
                    ) AS attendance_pct,
                    AVG(avg_students_no) AS avg_students_no,
                    AVG(max_students_no) AS max_students_no,
                    AVG(min_students_no) AS min_students_no,
                    AVG(students_enrolled) AS students_enrolled
                FROM classroom_synthetic_data_updated
                WHERE date = $1
                  AND ({hour_expr}) IS NOT NULL
                GROUP BY 1
                ORDER BY 1
            """
            results = await self.db.execute_query(query, d)
        else:
            query = f"""
                SELECT 
                    ({hour_expr})::int AS hour,
                    AVG(
                        CASE WHEN students_enrolled > 0 
                             THEN (avg_students_no::float / students_enrolled::float) * 100
                             ELSE 0
                        END
                    ) AS attendance_pct,
                    AVG(avg_students_no) AS avg_students_no,
                    AVG(max_students_no) AS max_students_no,
                    AVG(min_students_no) AS min_students_no,
                    AVG(students_enrolled) AS students_enrolled
                FROM classroom_synthetic_data_updated
                WHERE ({hour_expr}) IS NOT NULL
                GROUP BY 1
                ORDER BY 1
            """
            results = await self.db.execute_query(query)

        return [
            {
                "hour": int(r["hour"]),
                "attendance_pct": float(r["attendance_pct"]),
                "avg_students_no": float(r["avg_students_no"]),
                "max_students_no": float(r["max_students_no"]),
                "min_students_no": float(r["min_students_no"]),
                "students_enrolled": float(r["students_enrolled"]),
            }
            for r in results
        ]

    async def get_attendance_analytics_daily(
        self, start_date: Optional[str] = None, end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get daily attendance analytics with percentage calculations"""
        base = """
            SELECT 
                date,
                AVG(
                    CASE WHEN students_enrolled > 0 
                         THEN (avg_students_no::float / students_enrolled::float) * 100
                         ELSE 0
                    END
                ) AS attendance_pct,
                AVG(avg_students_no) AS avg_students_no,
                AVG(max_students_no) AS max_students_no,
                AVG(min_students_no) AS min_students_no,
                AVG(students_enrolled) AS students_enrolled
            FROM classroom_synthetic_data_updated
        """
        params: List[Any] = []
        conds: List[str] = []

        if start_date:
            params.append(self._parse_iso_date(start_date))
            conds.append(f"date >= ${len(params)}")
        if end_date:
            params.append(self._parse_iso_date(end_date))
            conds.append(f"date <= ${len(params)}")

        if conds:
            base += " WHERE " + " AND ".join(conds)
        base += " GROUP BY date ORDER BY date"

        results = await self.db.execute_query(base, *params)
        return [
            {
                "date": str(r["date"]),
                "attendance_pct": float(r["attendance_pct"]),
                "avg_students_no": float(r["avg_students_no"]),
                "max_students_no": float(r["max_students_no"]),
                "min_students_no": float(r["min_students_no"]),
                "students_enrolled": float(r["students_enrolled"]),
            }
            for r in results
        ]

    async def get_attendance_analytics_weekly(self) -> List[Dict[str, Any]]:
        """Get weekly attendance analytics with percentage calculations"""
        query = """
            SELECT 
                EXTRACT(WEEK FROM date) AS week,
                EXTRACT(YEAR FROM date) AS year,
                AVG(
                    CASE WHEN students_enrolled > 0 
                         THEN (avg_students_no::float / students_enrolled::float) * 100
                         ELSE 0
                    END
                ) AS attendance_pct,
                AVG(avg_students_no) AS avg_students_no,
                AVG(max_students_no) AS max_students_no,
                AVG(min_students_no) AS min_students_no,
                AVG(students_enrolled) AS students_enrolled
            FROM classroom_synthetic_data_updated
            GROUP BY 1, 2
            ORDER BY 2, 1
        """
        results = await self.db.execute_query(query)
        return [
            {
                "week": int(r["week"]),
                "year": int(r["year"]),
                "attendance_pct": float(r["attendance_pct"]),
                "avg_students_no": float(r["avg_students_no"]),
                "max_students_no": float(r["max_students_no"]),
                "min_students_no": float(r["min_students_no"]),
                "students_enrolled": float(r["students_enrolled"]),
            }
            for r in results
        ]

    async def get_enhanced_attention_metrics_hourly(self, target_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get hourly attention metrics including max, min, and avg rates"""
        hour_expr = self.HOUR_EXPR
        if target_date:
            d = self._parse_iso_date(target_date)
            query = f"""
                SELECT 
                    ({hour_expr})::int AS hour,
                    AVG(avg_attention_rate) AS avg_attention_rate,
                    AVG(avg_distraction_rate) AS avg_distraction_rate,
                    AVG(max_attention_rate) AS max_attention_rate,
                    AVG(max_distraction_rate) AS max_distraction_rate,
                    AVG(min_attention_rate) AS min_attention_rate,
                    AVG(min_distraction_rate) AS min_distraction_rate
                FROM classroom_synthetic_data_updated
                WHERE date = $1
                  AND ({hour_expr}) IS NOT NULL
                GROUP BY 1
                ORDER BY 1
            """
            results = await self.db.execute_query(query, d)
        else:
            query = f"""
                SELECT 
                    ({hour_expr})::int AS hour,
                    AVG(avg_attention_rate) AS avg_attention_rate,
                    AVG(avg_distraction_rate) AS avg_distraction_rate,
                    AVG(max_attention_rate) AS max_attention_rate,
                    AVG(max_distraction_rate) AS max_distraction_rate,
                    AVG(min_attention_rate) AS min_attention_rate,
                    AVG(min_distraction_rate) AS min_distraction_rate
                FROM classroom_synthetic_data_updated
                WHERE ({hour_expr}) IS NOT NULL
                GROUP BY 1
                ORDER BY 1
            """
            results = await self.db.execute_query(query)

        return [
            {
                "hour": int(r["hour"]),
                "avg_attention_rate": float(r["avg_attention_rate"]),
                "avg_distraction_rate": float(r["avg_distraction_rate"]),
                "max_attention_rate": float(r["max_attention_rate"]),
                "max_distraction_rate": float(r["max_distraction_rate"]),
                "min_attention_rate": float(r["min_attention_rate"]),
                "min_distraction_rate": float(r["min_distraction_rate"]),
            }
            for r in results
        ]

    async def get_enhanced_attention_metrics_daily(
        self, start_date: Optional[str] = None, end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get daily attention metrics including max, min, and avg rates"""
        base = """
            SELECT 
                date,
                AVG(avg_attention_rate) AS avg_attention_rate,
                AVG(avg_distraction_rate) AS avg_distraction_rate,
                AVG(max_attention_rate) AS max_attention_rate,
                AVG(max_distraction_rate) AS max_distraction_rate,
                AVG(min_attention_rate) AS min_attention_rate,
                AVG(min_distraction_rate) AS min_distraction_rate
            FROM classroom_synthetic_data_updated
        """
        params: List[Any] = []
        conds: List[str] = []

        if start_date:
            params.append(self._parse_iso_date(start_date))
            conds.append(f"date >= ${len(params)}")
        if end_date:
            params.append(self._parse_iso_date(end_date))
            conds.append(f"date <= ${len(params)}")

        if conds:
            base += " WHERE " + " AND ".join(conds)
        base += " GROUP BY date ORDER BY date"

        results = await self.db.execute_query(base, *params)
        return [
            {
                "date": str(r["date"]),
                "avg_attention_rate": float(r["avg_attention_rate"]),
                "avg_distraction_rate": float(r["avg_distraction_rate"]),
                "max_attention_rate": float(r["max_attention_rate"]),
                "max_distraction_rate": float(r["max_distraction_rate"]),
                "min_attention_rate": float(r["min_attention_rate"]),
                "min_distraction_rate": float(r["min_distraction_rate"]),
            }
            for r in results
        ]

    async def get_enhanced_attention_metrics_weekly(self) -> List[Dict[str, Any]]:
        """Get weekly attention metrics including max, min, and avg rates"""
        query = """
            SELECT 
                EXTRACT(WEEK FROM date) AS week,
                EXTRACT(YEAR FROM date) AS year,
                AVG(avg_attention_rate) AS avg_attention_rate,
                AVG(avg_distraction_rate) AS avg_distraction_rate,
                AVG(max_attention_rate) AS max_attention_rate,
                AVG(max_distraction_rate) AS max_distraction_rate,
                AVG(min_attention_rate) AS min_attention_rate,
                AVG(min_distraction_rate) AS min_distraction_rate
            FROM classroom_synthetic_data_updated
            GROUP BY 1, 2
            ORDER BY 2, 1
        """
        results = await self.db.execute_query(query)
        return [
            {
                "week": int(r["week"]),
                "year": int(r["year"]),
                "avg_attention_rate": float(r["avg_attention_rate"]),
                "avg_distraction_rate": float(r["avg_distraction_rate"]),
                "max_attention_rate": float(r["max_attention_rate"]),
                "max_distraction_rate": float(r["max_distraction_rate"]),
                "min_attention_rate": float(r["min_attention_rate"]),
                "min_distraction_rate": float(r["min_distraction_rate"]),
            }
            for r in results
        ]

    async def get_correlation_insights(self) -> Dict[str, Any]:
        """Get correlation analysis between attendance and attention"""
        query = """
            WITH session_data AS (
                SELECT 
                    CASE WHEN students_enrolled > 0 
                         THEN (avg_students_no::float / students_enrolled::float) * 100
                         ELSE 0
                    END AS attendance_pct,
                    avg_attention_rate
                FROM classroom_synthetic_data_updated
                WHERE students_enrolled > 0
            )
            SELECT 
                CORR(attendance_pct, avg_attention_rate) AS correlation,
                AVG(attendance_pct) AS avg_attendance,
                AVG(avg_attention_rate) AS avg_attention,
                COUNT(*) AS total_sessions
            FROM session_data
        """
        result = await self._fetch_one(query)
        
        if not result:
            return {
                "correlation": 0.0,
                "avg_attendance": 0.0,
                "avg_attention": 0.0,
                "total_sessions": 0
            }
        
        return {
            "correlation": float(result["correlation"]) if result["correlation"] is not None else 0.0,
            "avg_attendance": float(result["avg_attendance"]) if result["avg_attendance"] is not None else 0.0,
            "avg_attention": float(result["avg_attention"]) if result["avg_attention"] is not None else 0.0,
            "total_sessions": int(result["total_sessions"]) if result["total_sessions"] is not None else 0
        }

    async def get_performance_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary similar to EDA file"""
        # Get best and worst performing days
        best_worst_query = """
            WITH daily_performance AS (
                SELECT 
                    date,
                    AVG(
                        CASE WHEN students_enrolled > 0 
                             THEN (avg_students_no::float / students_enrolled::float) * 100
                             ELSE 0
                        END
                    ) AS attendance_pct,
                    AVG(avg_attention_rate) AS avg_attention_rate
                FROM classroom_synthetic_data_updated
                GROUP BY date
            ),
            ranked_days AS (
                SELECT 
                    date,
                    attendance_pct,
                    avg_attention_rate,
                    ROW_NUMBER() OVER (ORDER BY attendance_pct DESC) as best_rank,
                    ROW_NUMBER() OVER (ORDER BY attendance_pct ASC) as worst_rank
                FROM daily_performance
            )
            SELECT 
                MAX(CASE WHEN best_rank = 1 THEN date END) AS best_day,
                MAX(CASE WHEN best_rank = 1 THEN attendance_pct END) AS best_attendance,
                MAX(CASE WHEN best_rank = 1 THEN avg_attention_rate END) AS best_attention,
                MAX(CASE WHEN worst_rank = 1 THEN date END) AS worst_day,
                MAX(CASE WHEN worst_rank = 1 THEN attendance_pct END) AS worst_attendance,
                MAX(CASE WHEN worst_rank = 1 THEN avg_attention_rate END) AS worst_attention
            FROM ranked_days
        """
        best_worst_result = await self._fetch_one(best_worst_query)
        
        # Get best and worst time slots
        hour_expr = self.HOUR_EXPR
        time_slots_query = f"""
            WITH hourly_performance AS (
                SELECT 
                    ({hour_expr})::int AS hour,
                    AVG(avg_attention_rate) AS avg_attention_rate,
                    AVG(avg_distraction_rate) AS avg_distraction_rate
                FROM classroom_synthetic_data_updated
                WHERE ({hour_expr}) IS NOT NULL
                GROUP BY 1
            ),
            ranked_hours AS (
                SELECT 
                    hour,
                    avg_attention_rate,
                    avg_distraction_rate,
                    ROW_NUMBER() OVER (ORDER BY avg_attention_rate DESC) as best_rank,
                    ROW_NUMBER() OVER (ORDER BY avg_attention_rate ASC) as worst_rank
                FROM hourly_performance
            )
            SELECT 
                MAX(CASE WHEN best_rank = 1 THEN hour END) AS best_hour,
                MAX(CASE WHEN best_rank = 1 THEN avg_attention_rate END) AS best_hour_attention,
                MAX(CASE WHEN worst_rank = 1 THEN hour END) AS worst_hour,
                MAX(CASE WHEN worst_rank = 1 THEN avg_attention_rate END) AS worst_hour_attention
            FROM ranked_hours
        """
        time_slots_result = await self._fetch_one(time_slots_query)
        
        return {
            "best_day": str(best_worst_result["best_day"]) if best_worst_result and best_worst_result.get("best_day") else None,
            "best_day_attendance": float(best_worst_result["best_attendance"]) if best_worst_result and best_worst_result.get("best_attendance") is not None else 0.0,
            "best_day_attention": float(best_worst_result["best_attention"]) if best_worst_result and best_worst_result.get("best_attention") is not None else 0.0,
            "worst_day": str(best_worst_result["worst_day"]) if best_worst_result and best_worst_result.get("worst_day") else None,
            "worst_day_attendance": float(best_worst_result["worst_attendance"]) if best_worst_result and best_worst_result.get("worst_attendance") is not None else 0.0,
            "worst_day_attention": float(best_worst_result["worst_attention"]) if best_worst_result and best_worst_result.get("worst_attention") is not None else 0.0,
            "best_time_slot": int(time_slots_result["best_hour"]) if time_slots_result and time_slots_result.get("best_hour") is not None else 9,
            "best_time_attention": float(time_slots_result["best_hour_attention"]) if time_slots_result and time_slots_result.get("best_hour_attention") is not None else 0.0,
            "worst_time_slot": int(time_slots_result["worst_hour"]) if time_slots_result and time_slots_result.get("worst_hour") is not None else 15,
            "worst_time_attention": float(time_slots_result["worst_hour_attention"]) if time_slots_result and time_slots_result.get("worst_hour_attention") is not None else 0.0,
        }
