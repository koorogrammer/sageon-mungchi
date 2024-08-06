# 스크립트 실행 전
# export AWS_PROFILE=<your aws profile>
# export OC=<your law.go.kr OC>

import requests
import xml.etree.ElementTree as ET
import boto3
import json
from bs4 import BeautifulSoup
from io import BytesIO
import os


session = boto3.Session(profile_name=os.environ["AWS_PROFILE"])
s3 = session.client("s3")
bucket_name = "sageon-mungchi"
key = "case_data"

LIST_BASE_URL = "http://www.law.go.kr/DRF/lawSearch.do?target=prec"
DETAIL_BASE_URL = "http://www.law.go.kr/DRF/lawService.do?target=prec"

OC = os.environ["OC"]
RESPONSE_TYPE = "XML"
SEARCH_TYPE = "2"
QUERY = "세법"
DISPLAY_COUNT = "100"
# PRNC_YD = '20240805~20240805'

current_page = 1
total_page = None


def clean_html(html_content):
    if html_content is None:
        return ""
    soup = BeautifulSoup(html_content, "html.parser")
    return soup.get_text()


while total_page is None or current_page <= total_page:
    list_url = f"{LIST_BASE_URL}&OC={OC}&type={RESPONSE_TYPE}&search={SEARCH_TYPE}&query={QUERY}&page={current_page}&displayCount={DISPLAY_COUNT}"
    # list_url = f"{LIST_BASE_URL}&OC={OC}&type={RESPONSE_TYPE}&search={SEARCH_TYPE}&query={QUERY}&page={current_page}&displayCount={DISPLAY_COUNT}&prncYd={PRNC_YD}"
    list_response = requests.get(list_url)

    if list_response.status_code == 200:
        list_root = ET.fromstring(list_response.text)

        if total_page is None:
            for child in list_root.findall("totalCnt"):
                total_count = int(child.text)
            total_page = total_count // int(DISPLAY_COUNT) + 1

        for child in list_root.findall("page"):
            current_page = int(child.text)

        print(f"Processing: {current_page}/{total_page}")

        for prec in list_root.findall("prec"):
            case_info_no = prec.find("판례일련번호").text
            case_no = prec.find("사건번호").text
            case_name = prec.find("사건명").text
            case_date = prec.find("선고일자").text
            case_court = prec.find("법원명").text

            detail_url = f"{DETAIL_BASE_URL}&OC={OC}&type={RESPONSE_TYPE}&ID={case_info_no}"
            detail_response = requests.get(detail_url)

            if detail_response.status_code == 200:
                detail_root = ET.fromstring(detail_response.text)

                for child in detail_root.findall("판시사항"):
                    case_issue = clean_html(child.text)
                for child in detail_root.findall("판결요지"):
                    case_summary = clean_html(child.text)
                for child in detail_root.findall("판례내용"):
                    case_detail = clean_html(child.text)

            else:
                print("Error:", detail_response.text)
                break

            case_data = {
                "case_no": case_no,
                "case_name": case_name,
                "case_date": case_date,
                "case_court": case_court,
                "case_issue": case_issue,
                "case_summary": case_summary,
                "case_detail": case_detail,
            }
            s3.put_object(
                Bucket=bucket_name,
                Key=f"{key}/{case_date}/{case_no}.json",
                Body=json.dumps(case_data),
            )

    else:
        print("Error:", list_response.text)
        break

    current_page += 1
